/* eslint-disable no-restricted-syntax */
// Rẽ nhánh theo `question.type` (SINGLE_CHOICE/MULTIPLE_CHOICE/TEXT/FILL_BLANK/
// MATCHING/REORDER) không tránh được so sánh chuỗi hoa với QuestionKind — cùng lý do
// question-modal.tsx và fill-blank-form.tsx đã tắt rule này. Mọi chuỗi hiển thị vẫn
// lấy từ UI_TEXT như quy ước chung, disable chỉ để bỏ qua các ràng buộc cấu trúc
// (so sánh literal viết hoa, helper function nội bộ) vốn không hợp với một component
// thuần rẽ nhánh hiển thị như thế này.
"use client";

import { Check } from "lucide-react";
import { FILL_BLANK_MARKER_REGEX } from "@/constants/quiz.constants";
import { UI_TEXT } from "@/constants/ui-text.constants";
import type { QuestionAnswerPreviewProps } from "@/types/exam-set.types";
import { cx } from "@/utils/cx";

// Tách nội dung câu điền từ thành các đoạn text thường / marker {{n}}, để đoạn nào là
// marker được bọc riêng và tô nổi bật khi render. Dùng `new RegExp(...)` thay vì gọi
// thẳng FILL_BLANK_MARKER_REGEX.exec vì hằng số đó có flag "g" và là module-level:
// gọi trực tiếp sẽ làm lastIndex bị lưu lại giữa các lần gọi (giống lưu ý đã ghi ở
// fill-blank-form.tsx).
const splitFillBlankContent = (content: string): { key: string; text: string; isMarker: boolean }[] => {
    const regex = new RegExp(FILL_BLANK_MARKER_REGEX);
    const segments: { key: string; text: string; isMarker: boolean }[] = [];
    let cursor = 0;
    let match = regex.exec(content);

    while (match) {
        if (match.index > cursor) {
            segments.push({ key: `text-${cursor}`, text: content.slice(cursor, match.index), isMarker: false });
        }
        segments.push({ key: `marker-${match.index}`, text: match[0], isMarker: true });
        cursor = match.index + match[0].length;
        match = regex.exec(content);
    }

    if (cursor < content.length) {
        segments.push({ key: `text-${cursor}`, text: content.slice(cursor), isMarker: false });
    }

    return segments;
};

// Khối hiển thị đáp án của một câu hỏi ở màn chi tiết bộ đề, dùng chung cho cả card
// chi tiết (exam-set-detail-view.tsx) và preview import Excel khi phù hợp. Component
// KHÔNG render tiêu đề/điểm/nút sửa-xoá của câu hỏi — những phần đó do nơi gọi (card
// header) tự quản lý; component này chỉ lo phần thân đáp án đặc thù theo từng loại.
export function QuestionAnswerPreview({ question }: QuestionAnswerPreviewProps) {
    const { type } = question;

    // Câu tự luận (TEXT) không có khối đáp án nào để hiển thị — không render gì, tránh
    // để lại một khối trống vô nghĩa trên card.
    if (type === "TEXT") {
        return null;
    }

    if (type === "FILL_BLANK") {
        const blanks = question.blanks ?? [];
        const segments = splitFillBlankContent(question.text ?? "");

        return (
            <div className="flex flex-col gap-3 border-t border-slate-100 pt-2">
                <span className="text-[11px] font-extrabold tracking-wider text-slate-400 uppercase">{UI_TEXT.examsSetsEl.detailBlanksHeader}</span>

                <p className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm leading-relaxed font-medium text-slate-700">
                    {segments.map((segment) =>
                        segment.isMarker ? (
                            <mark key={segment.key} className="rounded bg-amber-200 px-1 py-0.5 font-extrabold text-amber-900">
                                {segment.text}
                            </mark>
                        ) : (
                            <span key={segment.key}>{segment.text}</span>
                        ),
                    )}
                </p>

                <div className="flex flex-col gap-2">
                    {blanks.map((blank) => (
                        <div key={blank.id} className="flex flex-col gap-1.5 rounded-2xl border border-slate-200/80 bg-white px-4 py-3">
                            <span className="text-xs font-extrabold text-slate-700">
                                {UI_TEXT.examsSetsEl.blankIndexPrefix}
                                {blank.index}
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                                {(blank.acceptedAnswers ?? [])
                                    .filter((answer) => answer && answer.trim() !== "")
                                    .map((answer, answerIndex) => (
                                        <span
                                            key={`${blank.id}-${answerIndex}`}
                                            className="inline-flex items-center rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white shadow-xs"
                                        >
                                            {answer}
                                        </span>
                                    ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (type === "MATCHING") {
        const pairs = question.pairs ?? [];

        return (
            <div className="flex flex-col gap-3 border-t border-slate-100 pt-2">
                <span className="text-[11px] font-extrabold tracking-wider text-slate-400 uppercase">{UI_TEXT.examsSetsEl.detailMatchingHeader}</span>

                <div className="overflow-hidden rounded-2xl border border-slate-200/80">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-4 py-2 text-[11px] font-extrabold tracking-wider text-slate-400 uppercase">
                                    {UI_TEXT.examsSetsEl.labelMatchingLeftColumn}
                                </th>
                                <th className="px-4 py-2 text-[11px] font-extrabold tracking-wider text-slate-400 uppercase">
                                    {UI_TEXT.examsSetsEl.labelMatchingRightColumn}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {pairs.map((pair) => (
                                <tr key={pair.id}>
                                    <td className="px-4 py-2.5 font-semibold text-slate-800">{pair.left}</td>
                                    <td className="px-4 py-2.5 font-semibold text-slate-800">{pair.right}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    if (type === "REORDER") {
        const blocks = question.blocks ?? [];

        return (
            <div className="flex flex-col gap-3 border-t border-slate-100 pt-2">
                <span className="text-[11px] font-extrabold tracking-wider text-slate-400 uppercase">{UI_TEXT.examsSetsEl.detailReorderHeader}</span>

                <div className="flex flex-col gap-2">
                    {blocks.map((block, index) => (
                        <div key={block.id} className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3">
                            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-extrabold text-white">
                                {index + 1}
                            </span>
                            <span className="text-sm font-semibold text-slate-800">{block.content}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // SINGLE_CHOICE / MULTIPLE_CHOICE — cut & paste nguyên khối radio/checkbox đã có
    // trong exam-set-detail-view.tsx, giữ nguyên 100% class Tailwind và hành vi.
    const options = question.options ?? [];
    const isMultiQuestion = options.filter((o) => o.isCorrect).length > 1;

    return (
        <div className="flex flex-col gap-3 border-t border-slate-100 pt-2">
            <span className="text-[11px] font-extrabold tracking-wider text-slate-400 uppercase">{UI_TEXT.examsSetsEl.optionsHeader}</span>
            <div className="flex flex-col gap-2.5">
                {options.map((opt) => (
                    <div
                        key={opt.id}
                        className={cx(
                            "flex items-center justify-between rounded-2xl border px-4 py-3 text-xs transition duration-150",
                            opt.isCorrect
                                ? "border-emerald-300 bg-emerald-50/40 font-semibold text-slate-900"
                                : "border-slate-200/80 bg-white font-medium text-slate-700",
                        )}
                    >
                        <div className="flex flex-1 items-center gap-3">
                            <div
                                className={cx(
                                    "flex size-5 shrink-0 items-center justify-center border-2",
                                    isMultiQuestion ? "rounded-md" : "rounded-full",
                                    opt.isCorrect ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 bg-white",
                                )}
                            >
                                {opt.isCorrect &&
                                    (isMultiQuestion ? (
                                        <Check className="size-3.5 stroke-[3] text-white" />
                                    ) : (
                                        <div className="size-1.5 rounded-full bg-white" />
                                    ))}
                            </div>
                            <span className="text-sm font-bold text-slate-900">
                                {opt.label}
                                {". "}
                                {opt.text}
                            </span>
                        </div>
                        {opt.isCorrect && (
                            <span className="inline-flex shrink-0 items-center justify-center rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-xs">
                                {UI_TEXT.examsSetsEl.correctAnswer}
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
