import { useEffect, useRef, useState } from "react";
import { BookText, FileText, HelpCircle, Layers, Play, Sparkles, Tag, Trash2 } from "lucide-react";
import { FlashcardDeckModal } from "@/components/application/modals/flashcard-deck-modal";
import { UI_TEXT } from "@/constants/ui-text.constants";
import { getFlashcardDeckById } from "@/services/flashcard.service";
import { sessionTypeService } from "@/services/session-type.service";
import type { SessionFormProps, SessionTypeOption } from "@/types/courseware.types";
import type { FlashcardDeckSummary } from "@/types/flashcard.types";
import { SessionTypeEnum } from "@/types/material.types";

export function SessionForm({
    mode,
    fields,
    setFields,
    onSubmit,
    onDelete,
    isPending: _isPending,
    onRegisterSave,
    isDirty,
    onOpenManageTypes,
    onOpenCompletionRule: _onOpenCompletionRule,
    typesReloadToken = 0,
    sessionId,
    courseId,
}: SessionFormProps) {
    const formRef = useRef<HTMLFormElement>(null);

    const [isFlashcardModalOpen, setIsFlashcardModalOpen] = useState(false);
    const [flashcardDeck, setFlashcardDeck] = useState<FlashcardDeckSummary | null>(null);

    useEffect(() => {
        const deckId = fields.flashcardDeckId;
        if (!deckId) {
            setFlashcardDeck(null);
            return;
        }

        let active = true;
        getFlashcardDeckById(deckId)
            .then((deck) => {
                if (active) setFlashcardDeck(deck);
            })
            .catch((err) => {
                console.warn("Could not load flashcard deck summary:", err);
                if (active) setFlashcardDeck(null);
            });
        return () => {
            active = false;
        };
    }, [fields.flashcardDeckId]);

    const [availableTypes, setAvailableTypes] = useState<SessionTypeOption[]>([
        { id: SessionTypeEnum.LY_THUYET, label: UI_TEXT.addSessionModal.sessionTypeTheory, code: SessionTypeEnum.LY_THUYET },
        { id: SessionTypeEnum.THUC_HANH, label: UI_TEXT.addSessionModal.sessionTypePractice, code: SessionTypeEnum.THUC_HANH },
        { id: SessionTypeEnum.BAI_TAP, label: UI_TEXT.addSessionModal.sessionTypeExercise, code: SessionTypeEnum.BAI_TAP },
        { id: SessionTypeEnum.KIEM_TRA, label: UI_TEXT.addSessionModal.sessionTypeQuiz, code: SessionTypeEnum.KIEM_TRA },
    ]);
    const [typesFromApi, setTypesFromApi] = useState(false);

    useEffect(() => {
        sessionTypeService
            .getAll(false)
            .then((data) => {
                if (data && data.length > 0) {
                    const mapped: SessionTypeOption[] = data
                        .filter((t) => t.isActive)
                        .map((t) => ({
                            id: t.id,
                            label: t.name,
                            code: t.code,
                            defaultBlocks: t.defaultBlocks,
                        }));
                    if (mapped.length > 0) {
                        setAvailableTypes(mapped);
                        setTypesFromApi(true);
                    }
                }
            })
            .catch((err) => {
                console.warn("Could not load backend session types, using default types:", err);
            });
    }, [typesReloadToken]);

    useEffect(() => {
        if (onRegisterSave) {
            onRegisterSave(() => {
                if (formRef.current) {
                    formRef.current.requestSubmit();
                }
            });
        }
    }, [onRegisterSave]);

    const title = mode === "create" ? UI_TEXT.courseDetail.addSessionTitle : UI_TEXT.courseDetail.editSessionTitle;
    const description = mode === "create" ? UI_TEXT.courseDetail.addSessionDescription : UI_TEXT.courseDetail.editSessionDescription;

    const selectedType = availableTypes.find((t) =>
        typesFromApi ? fields.typeId === t.id || (!fields.typeId && fields.type === t.code) : (fields.type || SessionTypeEnum.LY_THUYET) === t.id,
    );

    return (
        <div className="relative flex h-full flex-col gap-4 overflow-hidden rounded-2xl bg-white p-6 shadow-xs">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 pb-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-800">{title}</h3>
                        {isDirty && (
                            <span className="animate-pulse rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-600">
                                {UI_TEXT.sessionForm.unSavedBadge}
                            </span>
                        )}
                    </div>
                    <p className="mt-0.5 text-sm font-medium text-slate-400">{description}</p>
                </div>
                <div className="flex items-center gap-1">
                    {mode === "edit" && onDelete && (
                        <button
                            type="button"
                            onClick={onDelete}
                            className="flex cursor-pointer items-center gap-1.5 p-2 text-red-500 transition hover:text-red-600"
                            title={UI_TEXT.sessionForm.deleteChapterTooltip}
                        >
                            <Trash2 className="size-4" />
                        </button>
                    )}
                </div>
            </div>

            <form ref={formRef} onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col justify-between gap-4">
                <div className="custom-scrollbar flex flex-1 flex-col gap-6 overflow-y-auto pr-2">
                    <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-12 flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-slate-500">{UI_TEXT.courseDetail.sessionNameLabel}</label>
                                <input
                                    type="text"
                                    value={fields.name}
                                    onChange={(e) => setFields((prev) => ({ ...prev, name: e.target.value }))}
                                    placeholder={UI_TEXT.courseDetail.sessionNamePlaceholder}
                                    className="w-full rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium focus:border-wine focus:outline-none"
                                    autoFocus
                                    required
                                />
                            </div>

                            <div className="col-span-12 flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-slate-500">{UI_TEXT.courseDetail.sessionTypeLabel}</label>
                                    {onOpenManageTypes && (
                                        <button
                                            type="button"
                                            onClick={onOpenManageTypes}
                                            className="inline-flex cursor-pointer items-center gap-1 text-xs font-bold text-wine transition hover:underline"
                                        >
                                            <Tag className="size-3.5" />
                                            <span>{UI_TEXT.sessionForm.manageTypesBtn}</span>
                                        </button>
                                    )}
                                </div>

                                <div className="flex w-full flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-1.5">
                                    {availableTypes.map((t) => {
                                        const isSelected = selectedType?.id === t.id;
                                        return (
                                            <button
                                                key={t.id}
                                                type="button"
                                                onClick={() =>
                                                    setFields((prev) => ({
                                                        ...prev,
                                                        typeId: typesFromApi ? t.id : undefined,
                                                        type: t.code || t.id,
                                                    }))
                                                }
                                                className={`flex cursor-pointer items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all duration-150 ${
                                                    isSelected
                                                        ? "bg-wine text-white shadow-xs"
                                                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                                }`}
                                            >
                                                {(t.code || t.id) === SessionTypeEnum.LY_THUYET && <BookText className="size-3.5" />}
                                                {(t.code || t.id) === SessionTypeEnum.THUC_HANH && <Play className="size-3.5" />}
                                                {(t.code || t.id) === SessionTypeEnum.BAI_TAP && <FileText className="size-3.5" />}
                                                {(t.code || t.id) === SessionTypeEnum.KIEM_TRA && <HelpCircle className="size-3.5" />}
                                                <span>{t.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {mode === "create" && selectedType?.defaultBlocks && selectedType.defaultBlocks.length > 0 && (
                                <div className="col-span-12 flex flex-col gap-2 rounded-2xl border border-blue-100 bg-blue-50/50 p-3 text-xs">
                                    <div className="flex items-center gap-1.5 font-extrabold text-blue-900">
                                        <Layers className="size-4 text-blue-600" />
                                        <span>{UI_TEXT.addSessionModal.autoBlocksHint}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {selectedType.defaultBlocks.map((b, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center gap-2 rounded-xl border border-blue-200/80 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs"
                                            >
                                                <span>{b.title}</span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">{`(${b.type})`}</span>
                                                {b.isRequired ? (
                                                    <span className="rounded-md border border-red-100 bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                                                        {UI_TEXT.sessionNode.requiredTag}
                                                    </span>
                                                ) : (
                                                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                                                        {UI_TEXT.sessionForm.optionalTag}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="col-span-12 flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-slate-500">{UI_TEXT.courseDetail.sessionDescLabel}</label>
                                <textarea
                                    value={fields.description || ""}
                                    onChange={(e) => setFields((prev) => ({ ...prev, description: e.target.value }))}
                                    placeholder={UI_TEXT.courseDetail.sessionDescPlaceholder}
                                    rows={4}
                                    className="min-h-[100px] w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium focus:border-wine focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        <h4 className="text-xs font-bold tracking-wider text-slate-400 uppercase">{UI_TEXT.sessionForm.standardResourcesTitle}</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-slate-500">{UI_TEXT.courseDetail.sessionMindmapLabel}</label>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-sm font-medium text-slate-400">{UI_TEXT.courseDetail.sessionShowMindmapLabel}</span>
                                        <input
                                            type="checkbox"
                                            checked={!!fields.isShowMindmap}
                                            onChange={(e) => setFields((prev) => ({ ...prev, isShowMindmap: e.target.checked }))}
                                            className="size-3.5 cursor-pointer rounded border-slate-300 text-wine accent-wine"
                                        />
                                    </div>
                                </div>
                                <input
                                    type="text"
                                    value={fields.mindmap || ""}
                                    onChange={(e) => setFields((prev) => ({ ...prev, mindmap: e.target.value }))}
                                    placeholder={UI_TEXT.courseDetail.sessionMindmapPlaceholder}
                                    className="w-full rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium focus:border-wine focus:outline-none"
                                />
                            </div>

                            <div className="col-span-1 flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-slate-500">{UI_TEXT.courseDetail.sessionSrsLabel}</label>
                                <input
                                    type="text"
                                    value={fields.srs || ""}
                                    onChange={(e) => setFields((prev) => ({ ...prev, srs: e.target.value }))}
                                    placeholder={UI_TEXT.courseDetail.sessionSrsPlaceholder}
                                    className="w-full rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium focus:border-wine focus:outline-none"
                                />
                            </div>

                            <div className="col-span-1 flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-slate-500">{UI_TEXT.courseDetail.sessionPdfLabel}</label>
                                <input
                                    type="text"
                                    value={fields.pdf || ""}
                                    onChange={(e) => setFields((prev) => ({ ...prev, pdf: e.target.value }))}
                                    placeholder={UI_TEXT.courseDetail.sessionPdfPlaceholder}
                                    className="w-full rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium focus:border-wine focus:outline-none"
                                />
                            </div>

                            <div className="col-span-1 flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-slate-500">{UI_TEXT.courseDetail.sessionMiniProjectLabel}</label>
                                <input
                                    type="text"
                                    value={fields.miniProject || ""}
                                    onChange={(e) => setFields((prev) => ({ ...prev, miniProject: e.target.value }))}
                                    placeholder={UI_TEXT.courseDetail.sessionMiniProjectPlaceholder}
                                    className="w-full rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium focus:border-wine focus:outline-none"
                                />
                            </div>

                            <div className="col-span-1 flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-slate-500">{UI_TEXT.courseDetail.sessionEntranceQuizLabel}</label>
                                <input
                                    type="text"
                                    value={fields.practiceEntranceQuiz || ""}
                                    onChange={(e) => setFields((prev) => ({ ...prev, practiceEntranceQuiz: e.target.value }))}
                                    placeholder={UI_TEXT.courseDetail.sessionEntranceQuizPlaceholder}
                                    className="w-full rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium focus:border-wine focus:outline-none"
                                />
                            </div>

                            {/* Flashcard */}
                            <div className="col-span-2 flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-slate-500">{UI_TEXT.sessionForm.flashcardLabel}</label>
                                <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50/50 p-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <span className="flex size-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                                            <Sparkles className="size-4.5" />
                                        </span>
                                        {fields.flashcardDeckId && flashcardDeck ? (
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-800">{flashcardDeck.name}</span>
                                                <span className="text-xs font-medium text-slate-500">
                                                    {UI_TEXT.sessionForm.flashcardCardCountPrefix}
                                                    {flashcardDeck.cardCount}
                                                    {" • "}
                                                    {flashcardDeck.status
                                                        ? UI_TEXT.sessionForm.flashcardStatusPublished
                                                        : UI_TEXT.sessionForm.flashcardStatusDraft}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-xs font-medium text-slate-400">{UI_TEXT.sessionForm.flashcardEmpty}</span>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsFlashcardModalOpen(true)}
                                        disabled={mode === "create"}
                                        className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-purple-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <Sparkles className="size-3.5" />
                                        <span>{UI_TEXT.sessionForm.flashcardManageBtn}</span>
                                    </button>
                                </div>
                                {mode === "create" && <p className="text-xs font-medium text-amber-600">{UI_TEXT.sessionForm.flashcardCreateModeHint}</p>}
                            </div>
                        </div>
                    </div>
                </div>
            </form>

            {mode === "edit" && (
                <FlashcardDeckModal
                    isOpen={isFlashcardModalOpen}
                    onClose={() => setIsFlashcardModalOpen(false)}
                    sessionId={sessionId}
                    deckId={fields.flashcardDeckId}
                    courseId={courseId}
                    onChanged={(deckId) => setFields((prev) => ({ ...prev, flashcardDeckId: deckId }))}
                />
            )}
        </div>
    );
}
