/* eslint-disable no-restricted-syntax, @typescript-eslint/no-magic-numbers */
"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { Heading } from "react-aria-components";
import { ChoiceOptionsForm } from "@/components/application/modals/question-forms/choice-options-form";
import { FillBlankForm, parseMarkerIndexesRaw } from "@/components/application/modals/question-forms/fill-blank-form";
import { TiptapEditor } from "@/components/base/editor";
import { Select } from "@/components/base/select/select";
import { CustomModal, Dialog } from "@/components/ui/custom-modal";
import { MIN_FILL_BLANKS } from "@/constants/quiz.constants";
import { UI_TEXT } from "@/constants/ui-text.constants";
import { toast } from "@/services/toast.service";
import type { SelectItemType } from "@/types/base-components.types";
import type { BlankMock, OptionMock, QuestionKind, QuestionMock, QuestionModalProps } from "@/types/exam-set.types";

const defaultOptions = (): OptionMock[] => [
    { id: "o1", label: "A", text: "", isCorrect: true },
    { id: "o2", label: "B", text: "", isCorrect: false },
    { id: "o3", label: "C", text: "", isCorrect: false },
    { id: "o4", label: "D", text: "", isCorrect: false },
];

// 5 loại tạo mới được từ modal này. "TEXT" (câu tự luận) CỐ Ý không nằm trong danh
// sách này: câu tự luận soạn mới thật sự dùng EssayQuestionMock + essay-question-modal.tsx
// riêng. Nếu đang sửa một câu TEXT sẵn có (dữ liệu cũ / import Excel), ô chọn vẫn phải
// hiện đúng "Tự luận" (xem questionTypeItems bên dưới) nhưng bị khoá lại — không cho đổi
// sang loại khác và không cho tạo mới TEXT ở đây.
const creatableQuestionTypeItems: SelectItemType[] = [
    { id: "SINGLE_CHOICE", label: UI_TEXT.examsSetsEl.questionTypeSingle },
    { id: "MULTIPLE_CHOICE", label: UI_TEXT.examsSetsEl.questionTypeMultiple },
    { id: "FILL_BLANK", label: UI_TEXT.examsSetsEl.questionTypeFillBlank },
    { id: "MATCHING", label: UI_TEXT.examsSetsEl.questionTypeMatching },
    { id: "REORDER", label: UI_TEXT.examsSetsEl.questionTypeReorder },
];

export function QuestionModal({ isOpen, onClose, onSave, question }: QuestionModalProps) {
    const [points, setPoints] = useState(10);
    const [explanation, setExplanation] = useState("");
    const [options, setOptions] = useState<OptionMock[]>(defaultOptions());
    const [type, setType] = useState<QuestionKind>("SINGLE_CHOICE");
    const [blanks, setBlanks] = useState<BlankMock[]>([]);

    // Trắc nghiệm nhiều đáp án đúng giờ suy ra thẳng từ type, không còn là state riêng.
    const isMulti = type === "MULTIPLE_CHOICE";
    const isChoiceType = type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE";
    const isTextQuestion = type === "TEXT";
    const isFillBlank = type === "FILL_BLANK";
    // Chỉ thêm mục "TEXT" vào danh sách khi đang sửa một câu TEXT sẵn có, để ô chọn
    // hiện đúng loại của nó; mục này bị khoá (isDisabled) và Select cũng bị khoá toàn bộ.
    const questionTypeItems: SelectItemType[] = isTextQuestion
        ? [...creatableQuestionTypeItems, { id: "TEXT", label: UI_TEXT.examsSetsEl.questionTypeText, isDisabled: true }]
        : creatableQuestionTypeItems;

    useEffect(() => {
        if (isOpen) {
            if (question) {
                setPoints(question.points);
                setExplanation(question.explanation);
                setType(question.type);
                setBlanks(question.blanks || []);

                // Ensure exactly 4 options
                const loadedOpts = [...question.options];
                while (loadedOpts.length < 4) {
                    const nextLabel = String.fromCharCode(65 + loadedOpts.length); // A, B, C, D
                    loadedOpts.push({
                        id: `o_new_${loadedOpts.length + 1}`,
                        label: nextLabel,
                        text: "",
                        isCorrect: false,
                    });
                }
                setOptions(loadedOpts);
            } else {
                setPoints(10);
                setExplanation("");
                setOptions(defaultOptions());
                setType("SINGLE_CHOICE");
                setBlanks([]);
            }
        }
    }, [isOpen, question]);

    const handleSelectCorrect = (index: number) => {
        setOptions((prev) => {
            const updated = prev.map((opt, i) => {
                if (isMulti) {
                    // Toggle correctness in multi-choice mode
                    return i === index ? { ...opt, isCorrect: !opt.isCorrect } : opt;
                } else {
                    // Single choice mode: only this one is correct
                    return { ...opt, isCorrect: i === index };
                }
            });
            return updated;
        });
    };

    const handleOptionTextChange = (index: number, val: string) => {
        setOptions((prev) => prev.map((opt, i) => (i === index ? { ...opt, text: val } : opt)));
    };

    const handleTypeChange = (nextType: QuestionKind) => {
        if (nextType === "SINGLE_CHOICE" && type === "MULTIPLE_CHOICE") {
            // Reverting to single choice mode: keep only the first correct option, others set to false
            setOptions((prev) => {
                let foundCorrect = false;
                return prev.map((opt) => {
                    if (opt.isCorrect) {
                        if (!foundCorrect) {
                            foundCorrect = true;
                            return opt;
                        }
                        return { ...opt, isCorrect: false };
                    }
                    return opt;
                });
            });
        }
        setType(nextType);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const plainText = explanation.replace(/<\/?[^>]+(>|$)/g, "").trim();
        if (!plainText) {
            toast.error(UI_TEXT.examsSetsEl.title, UI_TEXT.examsSetsEl.labelQuestionDesc);
            return;
        }

        if (isChoiceType) {
            const correctOptions = options.filter((o) => o.isCorrect);
            if (correctOptions.length === 0) {
                toast.error(UI_TEXT.examsSetsEl.title, UI_TEXT.examsSetsEl.labelAnswersList);
                return;
            }

            const hasEmptyCorrectOption = correctOptions.some((o) => !o.text.trim());
            if (hasEmptyCorrectOption) {
                toast.error(UI_TEXT.examsSetsEl.title, UI_TEXT.examsSetsEl.placeholderAnswer);
                return;
            }
        }

        // Bốn luật của assertQuestionBank (backend) cho FILL_BLANK, chặn trước ở FE để
        // staff không phải đoán lỗi 400: đủ số chỗ trống tối thiểu, mỗi chỗ trống có
        // đáp án, đề không có marker trùng số, và tập số marker khớp đúng tập
        // blanks[].index.
        if (isFillBlank) {
            if (blanks.length < MIN_FILL_BLANKS) {
                toast.error(UI_TEXT.examsSetsEl.title, UI_TEXT.examsSetsEl.errorFillBlankMissing);
                return;
            }

            const hasBlankWithoutAnswer = blanks.some((b) => b.acceptedAnswers.every((a) => !a.trim()));
            if (hasBlankWithoutAnswer) {
                toast.error(UI_TEXT.examsSetsEl.title, UI_TEXT.examsSetsEl.errorBlankNoAnswer);
                return;
            }

            const rawMarkerIndexes = parseMarkerIndexesRaw(explanation);
            const hasDuplicateMarker = rawMarkerIndexes.length !== new Set(rawMarkerIndexes).size;
            if (hasDuplicateMarker) {
                toast.error(UI_TEXT.examsSetsEl.title, UI_TEXT.examsSetsEl.errorMarkerDuplicate);
                return;
            }

            const markerIndexSet = new Set(rawMarkerIndexes);
            const blankIndexSet = new Set(blanks.map((b) => b.index));
            const sameIndexSet = markerIndexSet.size === blankIndexSet.size && Array.from(markerIndexSet).every((idx) => blankIndexSet.has(idx));
            if (!sameIndexSet) {
                toast.error(UI_TEXT.examsSetsEl.title, UI_TEXT.examsSetsEl.errorMarkerMismatch);
                return;
            }
        }

        const questionText = plainText.length > 120 ? plainText.slice(0, 120) + "..." : plainText;

        const newQuestion: QuestionMock = {
            id: question?.id || `q_${Date.now()}`,
            text: questionText,
            explanation: explanation.trim(),
            points: Number(points) || 10,
            options: options.map((opt) => ({
                ...opt,
                text: opt.text.trim(),
            })),
            type,
            // Chỉ gửi blanks khi đúng là câu điền từ — đổi loại sang trắc nghiệm/khác
            // rồi lưu không được mang theo blanks cũ.
            blanks: isFillBlank
                ? blanks.map((b) => ({ ...b, acceptedAnswers: b.acceptedAnswers.map((a) => a.trim()).filter((a) => a.length > 0) }))
                : undefined,
        };

        onSave(newQuestion);
        toast.success(UI_TEXT.examsSetsEl.title, question ? UI_TEXT.examsSetsEl.toastQuestionUpdated : UI_TEXT.examsSetsEl.toastQuestionAdded);
        onClose();
    };

    return (
        <CustomModal.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <CustomModal.Content className="max-w-4xl !overflow-visible !rounded-[24px]">
                <Dialog className="flex max-h-[90vh] w-full flex-col rounded-[24px] bg-white shadow-2xl outline-none">
                    {/* Header */}
                    <div className="relative flex shrink-0 flex-col border-b border-slate-100 px-6 pt-6 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="flex size-10 items-center justify-center rounded-full border border-rose-100 bg-rose-50/50">
                                <CheckCircle2 className="size-5 text-wine" />
                            </div>
                            <div className="flex flex-col">
                                <Heading slot="title" className="text-[16px] leading-snug font-extrabold text-slate-800">
                                    {question ? UI_TEXT.examsSetsEl.modalEditTitle : UI_TEXT.examsSetsEl.modalAddTitle}
                                </Heading>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="absolute top-5 right-5 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                            aria-label="Close"
                        >
                            <X className="size-5" />
                        </button>
                    </div>

                    {/* Form Body */}
                    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
                        <div className="custom-scrollbar flex flex-1 flex-col gap-5 overflow-y-auto p-6">
                            {/* Question Type + Points Row */}
                            <div className="flex flex-wrap gap-4">
                                <div className="flex max-w-[280px] flex-1 flex-col gap-1.5">
                                    <label className="text-[12.5px] font-bold text-slate-700">{UI_TEXT.examsSetsEl.labelQuestionType}</label>
                                    <Select
                                        aria-label={UI_TEXT.examsSetsEl.labelQuestionType}
                                        selectedKey={type}
                                        onSelectionChange={(key) => key && handleTypeChange(key as QuestionKind)}
                                        items={questionTypeItems}
                                        size="md"
                                        isClearable={false}
                                        isDisabled={isTextQuestion}
                                    >
                                        {(item) => <Select.Item id={item.id} label={item.label} isDisabled={item.isDisabled} />}
                                    </Select>
                                </div>

                                <div className="flex max-w-[200px] flex-col gap-1.5">
                                    <label className="text-[12.5px] font-bold text-slate-700">{UI_TEXT.examsSetsEl.labelPoints}</label>
                                    <input
                                        type="number"
                                        value={points}
                                        onChange={(e) => setPoints(Number(e.target.value))}
                                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-[13.5px] font-medium text-slate-800 focus:border-wine focus:ring-1 focus:ring-wine focus:outline-none"
                                        required
                                        min={1}
                                    />
                                </div>
                            </div>

                            {/* Rich Editor Description: dùng cho mọi loại TRỪ FILL_BLANK. Câu điền từ
                                cần <textarea> thường (selectionStart) để chèn marker {{n}} đúng vị trí
                                con trỏ — xem comment giải thích đầy đủ trong fill-blank-form.tsx. */}
                            {isFillBlank ? (
                                <FillBlankForm content={explanation} onContentChange={setExplanation} blanks={blanks} onBlanksChange={setBlanks} />
                            ) : (
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[12.5px] font-bold text-slate-700">{UI_TEXT.examsSetsEl.labelQuestionDesc}</label>
                                    <TiptapEditor value={explanation} onChange={setExplanation} placeholder={UI_TEXT.examsSetsEl.placeholderQuestionDesc} />
                                </div>
                            )}

                            {/* Answers List Section: chỉ SINGLE_CHOICE/MULTIPLE_CHOICE có form ở task này.
                                MATCHING/REORDER chưa có form con — sẽ thêm ở các task sau. */}
                            {isChoiceType && (
                                <ChoiceOptionsForm
                                    options={options}
                                    isMulti={isMulti}
                                    onSelectCorrect={handleSelectCorrect}
                                    onOptionTextChange={handleOptionTextChange}
                                />
                            )}
                        </div>

                        {/* Footer Controls & Actions */}
                        <div className="flex shrink-0 items-center justify-end border-t border-slate-100 bg-slate-50/20 px-6 py-4.5">
                            {/* Cancel / Save actions */}
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                                >
                                    {UI_TEXT.examsSetsEl.btnCancel}
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-xl bg-wine px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-wine/10 transition hover:bg-wine-deep"
                                >
                                    {UI_TEXT.examsSetsEl.btnSave}
                                </button>
                            </div>
                        </div>
                    </form>
                </Dialog>
            </CustomModal.Content>
        </CustomModal.Root>
    );
}
