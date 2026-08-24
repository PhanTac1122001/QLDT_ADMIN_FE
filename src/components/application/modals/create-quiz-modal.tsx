"use client";

import { useEffect, useRef, useState } from "react";
import { Download, HelpCircle, Trash2, Upload, X } from "lucide-react";
import { Heading } from "react-aria-components";
import { CustomModal, Dialog } from "@/components/ui/custom-modal";
import { DEFAULT_PASS_THRESHOLD, QUIZ_IMPORT_ACCEPT } from "@/constants/quiz.constants";
import { UI_TEXT } from "@/constants/ui-text.constants";
import { createQuiz, downloadQuizExcelTemplate, importQuizExcel, updateQuiz } from "@/services/quiz.service";
import { toast } from "@/services/toast.service";
import type { CreateQuizModalProps, QuizImportRowError, QuizQuestionDto } from "@/types/quiz.types";
import { getQuestionTypeLabel } from "@/utils/quiz.utils";

export function CreateQuizModal({ isOpen, onClose, onSuccess, initialData }: CreateQuizModalProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [passThreshold, setPassThreshold] = useState<number>(DEFAULT_PASS_THRESHOLD);
    const [courseId, setCourseId] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [importedQuestions, setImportedQuestions] = useState<QuizQuestionDto[]>([]);
    const [importErrors, setImportErrors] = useState<QuizImportRowError[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isEditMode = Boolean(initialData);

    useEffect(() => {
        if (isOpen) {
            setImportedQuestions([]);
            setImportErrors([]);
            if (initialData) {
                const name = "name" in initialData ? initialData.name : initialData.title;
                setTitle(name || "");
                setDescription(initialData.description || "");
                setPassThreshold(initialData.passThreshold || DEFAULT_PASS_THRESHOLD);
                setCourseId(initialData.courseId || "");
            } else {
                setTitle("");
                setDescription("");
                setPassThreshold(DEFAULT_PASS_THRESHOLD);
                setCourseId("");
            }
        }
    }, [isOpen, initialData]);

    const handleDownloadTemplate = async () => {
        try {
            await downloadQuizExcelTemplate();
            toast.success(UI_TEXT.examsSetsEl.toastDownloadTitle, UI_TEXT.examsSetsEl.toastDownloadSuccess);
        } catch {
            toast.error(UI_TEXT.examsSetsEl.toastDownloadTitle, UI_TEXT.examsSetsEl.toastDownloadError);
        }
    };

    const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsImporting(true);
            const res = await importQuizExcel(file);
            const parsed = res.questions || [];
            const rowErrors = res.errors || [];
            setImportErrors(rowErrors);

            if (parsed.length > 0) {
                setImportedQuestions((prev) => [...prev, ...parsed]);
                const suffix = rowErrors.length > 0 ? UI_TEXT.examsSetsEl.toastImportPartialSuffix : UI_TEXT.examsSetsEl.toastImportSuccessSuffix;
                toast.success(UI_TEXT.examsSetsEl.toastImportTitle, `${UI_TEXT.examsSetsEl.toastImportSuccessPrefix}${parsed.length}${suffix}`);
            } else {
                toast.error(UI_TEXT.examsSetsEl.toastImportTitle, UI_TEXT.examsSetsEl.toastImportEmpty);
            }
        } catch (error: unknown) {
            const errObj = error as { message?: string };
            toast.error(UI_TEXT.examsSetsEl.toastImportTitle, errObj?.message || UI_TEXT.examsSetsEl.toastImportErrorDefault);
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleRemoveQuestion = (index: number) => {
        setImportedQuestions((prev) => prev.filter((_, i) => i !== index));
    };

    const handleClearImported = () => {
        setImportedQuestions([]);
        setImportErrors([]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            toast.error(UI_TEXT.examsSetsEl.title, UI_TEXT.examsSetsEl.toastEnterTitle);
            return;
        }

        try {
            setIsSubmitting(true);
            if (initialData) {
                const updated = await updateQuiz(initialData.id, {
                    title: title.trim(),
                    description: description.trim() || undefined,
                    passThreshold: Number(passThreshold) || DEFAULT_PASS_THRESHOLD,
                    courseId: courseId.trim() || undefined,
                });
                toast.success(UI_TEXT.examsSetsEl.title, UI_TEXT.examsSetsEl.toastQuestionUpdated);
                onSuccess(updated);
            } else {
                const created = await createQuiz({
                    title: title.trim(),
                    description: description.trim() || undefined,
                    passThreshold: Number(passThreshold) || DEFAULT_PASS_THRESHOLD,
                    courseId: courseId.trim() || undefined,
                    questions: importedQuestions,
                });
                toast.success(UI_TEXT.examsSetsEl.title, UI_TEXT.examsSetsEl.toastCreateSuccess);
                onSuccess(created);
            }
            onClose();
        } catch (error) {
            console.error("Save quiz error:", error);
            toast.error(UI_TEXT.examsSetsEl.title, initialData ? UI_TEXT.examsSetsEl.toastSaveQuestionsError : UI_TEXT.examsSetsEl.toastCreateError);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <CustomModal.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <CustomModal.Content className="max-w-xl !rounded-[24px]">
                <Dialog className="flex max-h-[90vh] flex-col rounded-[24px] bg-white shadow-2xl outline-none">
                    {/* Header */}
                    <div className="relative flex shrink-0 flex-col border-b border-slate-100 px-6 pt-6 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="flex size-10 items-center justify-center rounded-full border border-rose-100 bg-rose-50/50">
                                <HelpCircle className="size-5 text-wine" />
                            </div>
                            <div className="flex flex-col">
                                <Heading slot="title" className="text-[16px] leading-snug font-extrabold text-slate-800">
                                    {initialData ? UI_TEXT.examsSetsEl.editSet : UI_TEXT.examsSetsEl.createModalTitle}
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
                    <form onSubmit={handleSubmit} className="custom-scrollbar flex flex-col gap-4 overflow-y-auto p-6">
                        {/* Title Input */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[12.5px] font-bold text-slate-700">
                                {UI_TEXT.examsSetsEl.labelName} <span className="text-rose-500">{UI_TEXT.examsSetsEl.asterisk}</span>
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder={UI_TEXT.examsSetsEl.placeholderName}
                                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-[13.5px] font-medium text-slate-800 focus:border-wine focus:ring-1 focus:ring-wine focus:outline-none"
                                required
                            />
                        </div>

                        {/* Description Input */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[12.5px] font-bold text-slate-700">{UI_TEXT.examsSetsEl.labelDesc}</label>
                            <textarea
                                rows={3}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder={UI_TEXT.examsSetsEl.placeholderDesc}
                                className="w-full resize-none rounded-xl border border-slate-200 px-4 py-2.5 text-[13.5px] font-medium text-slate-800 focus:border-wine focus:ring-1 focus:ring-wine focus:outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {/* Pass Threshold */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[12.5px] font-bold text-slate-700">{UI_TEXT.examsSetsEl.labelPassThreshold}</label>
                                <input
                                    type="number"
                                    value={passThreshold}
                                    onChange={(e) => setPassThreshold(Number(e.target.value))}
                                    min={0}
                                    max={100}
                                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-[13.5px] font-medium text-slate-800 focus:border-wine focus:ring-1 focus:ring-wine focus:outline-none"
                                />
                            </div>

                            {/* Course ID (Optional) */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[12.5px] font-bold text-slate-700">{UI_TEXT.examsSetsEl.labelCourseIdOptional}</label>
                                <input
                                    type="text"
                                    value={courseId}
                                    onChange={(e) => setCourseId(e.target.value)}
                                    placeholder={UI_TEXT.examsSetsEl.placeholderCourseId}
                                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-[13.5px] font-medium text-slate-800 focus:border-wine focus:ring-1 focus:ring-wine focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Excel Import (create mode only) */}
                        {!isEditMode && (
                            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/40 p-4">
                                <input ref={fileInputRef} type="file" accept={QUIZ_IMPORT_ACCEPT} onChange={handleImportExcel} className="hidden" />

                                <div className="flex flex-col gap-1">
                                    <h3 className="text-[13px] font-bold text-slate-800">{UI_TEXT.examsSetsEl.importSectionHeader}</h3>
                                    <p className="text-[11.5px] font-medium text-slate-500">{UI_TEXT.examsSetsEl.importSectionHint}</p>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleDownloadTemplate}
                                        className="flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3 py-1.5 text-[11.5px] font-bold text-purple-700 hover:bg-purple-100"
                                    >
                                        <Download className="size-3.5" />
                                        {UI_TEXT.examsSetsEl.downloadTemplateBtn}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isImporting}
                                        className="flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3 py-1.5 text-[11.5px] font-bold text-purple-700 hover:bg-purple-100 disabled:opacity-50"
                                    >
                                        <Upload className="size-3.5" />
                                        {isImporting ? UI_TEXT.examsSetsEl.importingText : UI_TEXT.examsSetsEl.importExcelBtn}
                                    </button>

                                    {importedQuestions.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={handleClearImported}
                                            className="ml-auto flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11.5px] font-bold text-slate-600 hover:bg-slate-50"
                                        >
                                            <Trash2 className="size-3.5" />
                                            {UI_TEXT.examsSetsEl.clearImportedBtn}
                                        </button>
                                    )}
                                </div>

                                {/* Row-level errors */}
                                {importErrors.length > 0 && (
                                    <div className="flex flex-col gap-1 rounded-xl border border-amber-200 bg-amber-50 p-3">
                                        <p className="text-[11.5px] font-bold text-amber-800">
                                            {UI_TEXT.examsSetsEl.importErrorsHeaderPrefix}
                                            {importErrors.length}
                                            {UI_TEXT.examsSetsEl.importErrorsHeaderSuffix}
                                        </p>
                                        <ul className="custom-scrollbar flex max-h-24 flex-col gap-0.5 overflow-y-auto">
                                            {importErrors.map((err) => (
                                                <li key={`${err.row}-${err.message}`} className="text-[11px] font-medium text-amber-700">
                                                    {UI_TEXT.examsSetsEl.importErrorRowPrefix}
                                                    {err.row}
                                                    {UI_TEXT.examsSetsEl.importErrorRowSeparator}
                                                    {err.message}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Imported questions preview */}
                                {importedQuestions.length > 0 ? (
                                    <div className="flex flex-col gap-2">
                                        <span className="text-[12px] font-bold text-slate-700">
                                            {UI_TEXT.examsSetsEl.importedCountPrefix}
                                            {importedQuestions.length}
                                            {UI_TEXT.examsSetsEl.importedCountSuffix}
                                        </span>
                                        <ul className="custom-scrollbar flex max-h-48 flex-col gap-1.5 overflow-y-auto">
                                            {importedQuestions.map((q, index) => {
                                                // Tóm tắt gọn cho 3 dạng mới (FILL_BLANK/MATCHING/REORDER): preview này là
                                                // danh sách rút gọn, không đủ chỗ cho QuestionAnswerPreview (component thiết
                                                // kế cho card chi tiết đầy đủ ở màn chi tiết bộ đề) — mỗi câu import chỉ cần
                                                // một dòng cho biết "có bao nhiêu phần tử" để staff biết mình đã đọc đúng
                                                // dòng Excel, không cần xem chi tiết từng chỗ trống/cặp/khối ở đây. Dùng
                                                // object tra theo q.type thay vì so sánh chuỗi trực tiếp (tránh literal viết
                                                // hoa trong BinaryExpression bị eslint no-restricted-syntax chặn ở file này).
                                                const summaryByType: Record<string, string> = {
                                                    FILL_BLANK: `${(q.blanks ?? []).length}${UI_TEXT.examsSetsEl.separator}${UI_TEXT.examsSetsEl.detailBlanksHeader}`,
                                                    MATCHING: `${(q.pairs ?? []).length}${UI_TEXT.examsSetsEl.separator}${UI_TEXT.examsSetsEl.detailMatchingHeader}`,
                                                    REORDER: `${(q.blocks ?? []).length}${UI_TEXT.examsSetsEl.separator}${UI_TEXT.examsSetsEl.detailReorderHeader}`,
                                                };
                                                const typeSummary = summaryByType[q.type];

                                                return (
                                                    <li
                                                        key={`${index}-${q.content}`}
                                                        className="flex items-start justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"
                                                    >
                                                        <div className="flex min-w-0 flex-col gap-0.5">
                                                            <span className="line-clamp-2 text-[12px] font-semibold text-slate-800">{q.content}</span>
                                                            <span className="text-[10.5px] font-medium text-slate-500">
                                                                {getQuestionTypeLabel(q.type)}
                                                                {UI_TEXT.examsSetsEl.separator}
                                                                {q.points ?? 0}
                                                                {UI_TEXT.examsSetsEl.pointsUnit}
                                                            </span>
                                                            {typeSummary && <span className="text-[10.5px] font-medium text-slate-400">{typeSummary}</span>}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveQuestion(index)}
                                                            className="shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                                                            aria-label={UI_TEXT.examsSetsEl.removeQuestionTooltip}
                                                            title={UI_TEXT.examsSetsEl.removeQuestionTooltip}
                                                        >
                                                            <X className="size-4" />
                                                        </button>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                ) : (
                                    <p className="text-[11.5px] font-medium text-slate-400">{UI_TEXT.examsSetsEl.noImportedQuestions}</p>
                                )}
                            </div>
                        )}

                        {/* Footer Controls */}
                        <div className="mt-2 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                            >
                                {UI_TEXT.common.cancel}
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="rounded-xl bg-wine px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-wine/10 transition hover:bg-wine-deep disabled:opacity-50"
                            >
                                {isSubmitting ? UI_TEXT.examsSetsEl.submitting : initialData ? UI_TEXT.examsSetsEl.btnSave : UI_TEXT.examsSetsEl.btnCreateQuiz}
                            </button>
                        </div>
                    </form>
                </Dialog>
            </CustomModal.Content>
        </CustomModal.Root>
    );
}
