/* eslint-disable no-restricted-syntax */
"use client";

import { useEffect, useRef } from "react";
import { Plus, Trash2 } from "lucide-react";
import { FILL_BLANK_MARKER_REGEX } from "@/constants/quiz.constants";
import { UI_TEXT } from "@/constants/ui-text.constants";
import type { BlankMock, FillBlankFormProps } from "@/types/exam-set.types";

// Danh sách RAW các số marker {{n}} xuất hiện trong đề, GIỮ NGUYÊN trùng lặp (không
// dùng Set) — cần bản raw này để phát hiện marker bị trùng số (vd "{{1}} ... {{1}}"),
// một trong 4 luật assertQuestionBank áp ở backend. Dùng `new RegExp(...)` thay vì gọi
// thẳng FILL_BLANK_MARKER_REGEX.exec vì hằng số đó có flag "g" và là module-level: gọi
// trực tiếp sẽ làm lastIndex bị lưu lại giữa các lần gọi, gây lỗi khó lường khi hàm này
// được gọi nhiều lần (vd trong effect lẫn trong validate của question-modal.tsx).
export const parseMarkerIndexesRaw = (content: string): number[] => {
    const regex = new RegExp(FILL_BLANK_MARKER_REGEX);
    const result: number[] = [];
    let match = regex.exec(content);
    while (match) {
        result.push(Number(match[1]));
        match = regex.exec(content);
    }
    return result;
};

// Danh sách số marker có trong đề, đã loại trùng và sắp tăng dần. Đây là NGUỒN SỰ THẬT
// duy nhất cho danh sách chỗ trống hiển thị trong form — không được suy từ blanks.length,
// vì staff có thể đã xoá chỗ trống ở giữa đề.
export const parseMarkerIndexes = (content: string): number[] => Array.from(new Set(parseMarkerIndexesRaw(content))).sort((a, b) => a - b);

// Số nhỏ nhất (>= 1) chưa xuất hiện trong danh sách marker hiện có. Dùng cho nút "Chèn
// chỗ trống": nếu đề còn {{1}} và {{3}} (staff đã xoá {{2}}) thì chèn tiếp phải ra
// {{2}}, không phải {{4}}.
const nextAvailableIndex = (usedIndexes: number[]): number => {
    let candidate = 1;
    while (usedIndexes.includes(candidate)) {
        candidate += 1;
    }
    return candidate;
};

export function FillBlankForm({ content, onContentChange, blanks, onBlanksChange }: FillBlankFormProps) {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    // Đồng bộ danh sách chỗ trống theo marker THẬT có trong đề mỗi khi đề hoặc danh
    // sách chỗ trống đổi. Khoá theo `index` (số trong {{n}}), KHÔNG theo vị trí trong
    // mảng: nếu khoá theo vị trí, xoá {{1}} sẽ làm đáp án của {{2}} bị trượt sang chỗ
    // {{1}}, staff mất dữ liệu mà không hiểu vì sao. `sameSet` bên dưới khiến effect
    // này idempotent (so khớp theo tập index, không theo tham chiếu mảng), nên đưa
    // `blanks` vào dependency array không gây lặp vô hạn: khi hai tập index đã khớp,
    // effect trả về sớm mà không gọi onBlanksChange nữa.
    useEffect(() => {
        const markerIndexes = parseMarkerIndexes(content);
        const currentIndexes = blanks.map((blank) => blank.index);

        const sameSet = markerIndexes.length === currentIndexes.length && markerIndexes.every((idx) => currentIndexes.includes(idx));
        if (sameSet) {
            return;
        }

        const synced: BlankMock[] = markerIndexes.map((idx) => {
            const existing = blanks.find((blank) => blank.index === idx);
            // Giữ nguyên đáp án đã nhập của chỗ trống còn tồn tại; chỗ trống mới xuất
            // hiện thì sinh một dòng nhập đáp án rỗng.
            return existing ?? { id: `blank_${idx}_${Date.now()}`, index: idx, acceptedAnswers: [""] };
        });
        onBlanksChange(synced);
    }, [content, blanks, onBlanksChange]);

    const handleInsertBlank = () => {
        const textarea = textareaRef.current;
        const usedIndexes = parseMarkerIndexes(content);
        const nextIndex = nextAvailableIndex(usedIndexes);
        const marker = `{{${nextIndex}}}`;

        const cursorPos = textarea ? textarea.selectionStart : content.length;
        const nextContent = content.slice(0, cursorPos) + marker + content.slice(cursorPos);
        onContentChange(nextContent);

        // Đặt lại con trỏ ngay sau marker vừa chèn, không để nhảy về đầu ô: staff có thể
        // đang gõ giữa câu. Phải đợi React render giá trị mới vào DOM rồi mới set lại
        // selection nên dùng requestAnimationFrame thay vì set ngay trong cùng tick.
        requestAnimationFrame(() => {
            if (textarea) {
                const caretPos = cursorPos + marker.length;
                textarea.focus();
                textarea.setSelectionRange(caretPos, caretPos);
            }
        });
    };

    const handleAnswerChange = (blankId: string, answerIndex: number, value: string) => {
        onBlanksChange(
            blanks.map((blank) =>
                blank.id === blankId ? { ...blank, acceptedAnswers: blank.acceptedAnswers.map((answer, i) => (i === answerIndex ? value : answer)) } : blank,
            ),
        );
    };

    const handleAddAnswer = (blankId: string) => {
        onBlanksChange(blanks.map((blank) => (blank.id === blankId ? { ...blank, acceptedAnswers: [...blank.acceptedAnswers, ""] } : blank)));
    };

    const handleRemoveAnswer = (blankId: string, answerIndex: number) => {
        onBlanksChange(
            blanks.map((blank) => (blank.id === blankId ? { ...blank, acceptedAnswers: blank.acceptedAnswers.filter((_, i) => i !== answerIndex) } : blank)),
        );
    };

    return (
        <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-bold text-slate-700">{UI_TEXT.examsSetsEl.labelFillBlankContent}</label>
                {/* Dùng <textarea> thường thay vì TiptapEditor CHỈ CHO dạng điền từ. Nút
                    "Chèn chỗ trống" bên dưới cần selectionStart để chèn {{n}} đúng vị trí
                    con trỏ; TiptapEditor (src/components/base/editor) chỉ nhận value/onChange
                    và không expose editor instance, còn sửa component dùng chung đó sẽ ảnh
                    hưởng cả màn bài đọc và bài học. Câu điền từ vốn là một câu văn thuần,
                    không phải tài liệu có định dạng, nên textarea là đủ. Giá trị vẫn là
                    chuỗi nên không phá round-trip explanation (mapUiQuestionsToBackendDtos
                    vẫn gửi content: q.explanation || q.text như các dạng khác). */}
                <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => onContentChange(e.target.value)}
                    placeholder={UI_TEXT.examsSetsEl.placeholderFillBlankContent}
                    rows={4}
                    className="w-full resize-none rounded-xl border border-slate-200 px-4 py-2.5 text-[13.5px] leading-relaxed font-medium text-slate-800 focus:border-wine focus:ring-1 focus:ring-wine focus:outline-none"
                />
                <button
                    type="button"
                    onClick={handleInsertBlank}
                    className="flex w-fit items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                >
                    <Plus className="size-3.5" />
                    {UI_TEXT.examsSetsEl.btnInsertBlank}
                </button>
            </div>

            <div className="flex flex-col gap-2.5">
                <label className="text-[12.5px] font-bold text-slate-700">{UI_TEXT.examsSetsEl.labelBlanksList}</label>
                <p className="text-[12px] text-slate-500">{UI_TEXT.examsSetsEl.hintFillBlankMultipleAnswers}</p>

                {blanks.map((blank) => (
                    <div key={blank.id} className="flex flex-col gap-2.5 rounded-2xl border border-slate-200 bg-white p-4.5">
                        <span className="text-xs font-bold text-slate-700">
                            {UI_TEXT.examsSetsEl.blankIndexPrefix}
                            {blank.index}
                        </span>
                        <span className="text-[11.5px] font-semibold text-slate-500">{UI_TEXT.examsSetsEl.labelBlankAnswers}</span>

                        <div className="flex flex-col gap-2">
                            {blank.acceptedAnswers.map((answer, answerIndex) => (
                                <div key={answerIndex} className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={answer}
                                        onChange={(e) => handleAnswerChange(blank.id, answerIndex, e.target.value)}
                                        placeholder={UI_TEXT.examsSetsEl.placeholderBlankAnswer}
                                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-[13px] font-medium text-slate-800 focus:border-wine focus:ring-1 focus:ring-wine focus:outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveAnswer(blank.id, answerIndex)}
                                        aria-label={UI_TEXT.examsSetsEl.btnRemoveBlankAnswer}
                                        className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-wine"
                                    >
                                        <Trash2 className="size-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={() => handleAddAnswer(blank.id)}
                            className="flex w-fit items-center gap-1.5 text-xs font-bold text-wine transition hover:text-wine-deep"
                        >
                            <Plus className="size-3.5" />
                            {UI_TEXT.examsSetsEl.btnAddBlankAnswer}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
