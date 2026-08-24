"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, Download, Plus, Trash2, Upload, X } from "lucide-react";
import { Heading } from "react-aria-components";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { TextArea } from "@/components/base/textarea/textarea";
import { CustomModal, Dialog } from "@/components/ui/custom-modal";
import { UI_TEXT } from "@/constants/ui-text.constants";
import {
    addFlashcardCard,
    createFlashcardDeck,
    deleteFlashcardCard,
    downloadFlashcardTemplate,
    getFlashcardDeckById,
    importFlashcardExcel,
    updateFlashcardCard,
    updateFlashcardDeck,
} from "@/services/flashcard.service";
import { toast } from "@/services/toast.service";
import type { FlashcardCard, FlashcardDeckModalProps } from "@/types/flashcard.types";

const descriptionRows = 2;
const exampleRows = 2;
const noneSkipped = 0;

export function FlashcardDeckModal({ isOpen, onClose, sessionId, deckId, courseId, onChanged }: FlashcardDeckModalProps) {
    const [currentDeckId, setCurrentDeckId] = useState<string | undefined>(deckId);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [isPublished, setIsPublished] = useState(false);
    const [cards, setCards] = useState<FlashcardCard[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const originalCardsRef = useRef<FlashcardCard[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const applyDeck = (deck: { id: string; name: string; description?: string; status: boolean; cards?: FlashcardCard[] }) => {
        setCurrentDeckId(deck.id);
        setName(deck.name || "");
        setDescription(deck.description || "");
        setIsPublished(Boolean(deck.status));
        const loadedCards = deck.cards || [];
        setCards(loadedCards.map((c) => ({ ...c })));
        originalCardsRef.current = loadedCards.map((c) => ({ ...c }));
    };

    useEffect(() => {
        if (!isOpen) return;

        setCurrentDeckId(deckId);
        if (!deckId) {
            setName("");
            setDescription("");
            setIsPublished(false);
            setCards([]);
            originalCardsRef.current = [];
            return;
        }

        const fetchDeck = async () => {
            try {
                setIsLoading(true);
                const deck = await getFlashcardDeckById(deckId);
                applyDeck(deck);
            } catch (error) {
                console.error("Load flashcard deck error:", error);
                toast.error(UI_TEXT.flashcardDeckModal.toastSaveTitle, UI_TEXT.flashcardDeckModal.toastLoadError);
            } finally {
                setIsLoading(false);
            }
        };

        void fetchDeck();
    }, [isOpen, deckId]);

    const handleAddCard = () => {
        setCards((prev) => [...prev, { front: "", back: "", pronunciation: "", example: "", imageUrl: "", audioUrl: "", position: prev.length }]);
    };

    const handleRemoveCard = (index: number) => {
        setCards((prev) => prev.filter((_, i) => i !== index));
    };

    const handleCardChange = <K extends keyof FlashcardCard>(index: number, field: K, value: FlashcardCard[K]) => {
        setCards((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const handleDownloadTemplate = async () => {
        try {
            await downloadFlashcardTemplate();
            toast.success(UI_TEXT.flashcardDeckModal.toastDownloadTitle, UI_TEXT.flashcardDeckModal.toastDownloadSuccess);
        } catch {
            toast.error(UI_TEXT.flashcardDeckModal.toastDownloadTitle, UI_TEXT.flashcardDeckModal.toastDownloadError);
        }
    };

    const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!sessionId) {
            toast.error(UI_TEXT.flashcardDeckModal.toastImportTitle, UI_TEXT.flashcardDeckModal.needSessionHint);
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        try {
            setIsImporting(true);
            const res = await importFlashcardExcel(sessionId, file, name.trim() || undefined);
            const deck = await getFlashcardDeckById(res.deckId);
            applyDeck(deck);
            onChanged(res.deckId);

            const skippedText =
                res.skipped > noneSkipped
                    ? `${UI_TEXT.flashcardDeckModal.toastImportSkippedPrefix}${res.skipped}${UI_TEXT.flashcardDeckModal.toastImportSkippedSuffix}`
                    : "";
            toast.success(
                UI_TEXT.flashcardDeckModal.toastImportTitle,
                `${UI_TEXT.flashcardDeckModal.toastImportSuccessPrefix}${res.imported}${UI_TEXT.flashcardDeckModal.toastImportSuccessSuffix}${skippedText}`,
            );
        } catch (error) {
            console.error("Import flashcard excel error:", error);
            const errObj = error as { message?: string };
            toast.error(UI_TEXT.flashcardDeckModal.toastImportTitle, errObj?.message || UI_TEXT.flashcardDeckModal.toastImportError);
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const buildCardPayload = (card: FlashcardCard, position: number): FlashcardCard => ({
        front: card.front.trim(),
        back: card.back.trim(),
        pronunciation: card.pronunciation?.trim() || undefined,
        example: card.example?.trim() || undefined,
        imageUrl: card.imageUrl?.trim() || undefined,
        audioUrl: card.audioUrl?.trim() || undefined,
        position,
    });

    const hasCardChanged = (before: FlashcardCard, after: FlashcardCard) =>
        before.front !== after.front ||
        before.back !== after.back ||
        (before.pronunciation || "") !== (after.pronunciation || "") ||
        (before.example || "") !== (after.example || "") ||
        (before.imageUrl || "") !== (after.imageUrl || "") ||
        (before.audioUrl || "") !== (after.audioUrl || "");

    const syncCards = async (targetDeckId: string) => {
        const original = originalCardsRef.current;
        const currentIds = cards.map((c) => c.id).filter((id): id is string => !!id);

        for (const oc of original) {
            if (oc.id && !currentIds.includes(oc.id)) {
                await deleteFlashcardCard(targetDeckId, oc.id);
            }
        }

        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];
            const payload = buildCardPayload(card, i);
            if (!card.id) {
                await addFlashcardCard(targetDeckId, payload);
            } else {
                const before = original.find((o) => o.id === card.id);
                if (before && hasCardChanged(before, card)) {
                    await updateFlashcardCard(targetDeckId, card.id, payload);
                }
            }
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            toast.error(UI_TEXT.flashcardDeckModal.toastSaveTitle, UI_TEXT.flashcardDeckModal.toastSaveNameError);
            return;
        }

        try {
            setIsSaving(true);

            if (!currentDeckId) {
                const created = await createFlashcardDeck({
                    name: name.trim(),
                    description: description.trim() || undefined,
                    courseId,
                    status: isPublished,
                    cards: cards.map((c, i) => buildCardPayload(c, i)),
                });
                const refreshed = await getFlashcardDeckById(created.id);
                applyDeck(refreshed);
                onChanged(created.id);
            } else {
                await updateFlashcardDeck(currentDeckId, {
                    name: name.trim(),
                    description: description.trim() || undefined,
                    status: isPublished,
                });
                await syncCards(currentDeckId);
                const refreshed = await getFlashcardDeckById(currentDeckId);
                applyDeck(refreshed);
                onChanged(currentDeckId);
            }

            toast.success(UI_TEXT.flashcardDeckModal.toastSaveTitle, UI_TEXT.flashcardDeckModal.toastSaveSuccess);
        } catch (error) {
            console.error("Save flashcard deck error:", error);
            toast.error(UI_TEXT.flashcardDeckModal.toastSaveTitle, UI_TEXT.flashcardDeckModal.toastSaveError);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <CustomModal.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <CustomModal.Content className="w-full max-w-4xl !rounded-[24px]">
                <Dialog className="flex max-h-[90vh] w-full flex-col rounded-[24px] bg-white shadow-2xl outline-none">
                    {/* Header */}
                    <div className="relative flex flex-col border-b border-slate-100 px-6 pt-6 pb-4">
                        <div className="flex items-center gap-3">
                            <span className="flex size-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                                <BookOpen className="size-5" />
                            </span>
                            <div className="flex flex-col">
                                <Heading slot="title" className="text-xl font-bold text-slate-900">
                                    {UI_TEXT.flashcardDeckModal.title}
                                </Heading>
                                <span className="text-xs font-medium text-slate-400">{UI_TEXT.flashcardDeckModal.subtitle}</span>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="absolute top-5 right-5 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                            aria-label={UI_TEXT.flashcardDeckModal.closeLabel}
                        >
                            <X className="size-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="custom-scrollbar flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-6">
                        {!sessionId && (
                            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3 text-xs font-semibold text-amber-700">
                                {UI_TEXT.flashcardDeckModal.needSessionHint}
                            </div>
                        )}

                        {/* Deck meta */}
                        <div className="flex flex-col gap-4">
                            <Input
                                label={
                                    <span>
                                        {UI_TEXT.flashcardDeckModal.deckNameLabel} <span className="font-bold text-red-500">{"*"}</span>
                                    </span>
                                }
                                placeholder={UI_TEXT.flashcardDeckModal.deckNamePlaceholder}
                                value={name}
                                onChange={(val) => setName(val)}
                                size="sm"
                            />
                            <TextArea
                                label={UI_TEXT.flashcardDeckModal.deckDescriptionLabel}
                                placeholder={UI_TEXT.flashcardDeckModal.deckDescriptionPlaceholder}
                                value={description}
                                onChange={(val) => setDescription(val)}
                                rows={descriptionRows}
                            />

                            {/* Publish toggle */}
                            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/50 p-3">
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-slate-700">{UI_TEXT.flashcardDeckModal.publishLabel}</span>
                                    <span className="text-xs font-medium text-slate-400">{UI_TEXT.flashcardDeckModal.publishHint}</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={isPublished}
                                    onChange={(e) => setIsPublished(e.target.checked)}
                                    className="size-5 cursor-pointer rounded border-slate-300 text-purple-600 accent-purple-600 focus:ring-purple-500"
                                />
                            </div>
                        </div>

                        {/* Cards toolbar */}
                        <div className="flex flex-col gap-4 border-t border-slate-100 pt-4">
                            <input ref={fileInputRef} type="file" accept=".xlsx, .xls" onChange={handleImportExcel} className="hidden" />

                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <h3 className="text-sm font-bold text-slate-800">
                                    {UI_TEXT.flashcardDeckModal.cardsListHeaderPrefix}
                                    {cards.length}
                                    {UI_TEXT.flashcardDeckModal.cardsListHeaderSuffix}
                                </h3>
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleDownloadTemplate}
                                        className="flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-700 hover:bg-purple-100"
                                    >
                                        <Download className="size-3.5" />
                                        {UI_TEXT.flashcardDeckModal.downloadTemplateBtn}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isImporting || !sessionId}
                                        className="flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-700 hover:bg-purple-100 disabled:opacity-50"
                                    >
                                        <Upload className="size-3.5" />
                                        {isImporting ? UI_TEXT.flashcardDeckModal.importingText : UI_TEXT.flashcardDeckModal.importExcelBtn}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleAddCard}
                                        className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-700"
                                    >
                                        <Plus className="size-3.5" />
                                        {UI_TEXT.flashcardDeckModal.addCardBtn}
                                    </button>
                                </div>
                            </div>

                            <p className="text-xs font-medium text-slate-400">{UI_TEXT.flashcardDeckModal.importReplaceHint}</p>

                            {isLoading ? (
                                <div className="p-6 text-center text-xs text-slate-500">{UI_TEXT.flashcardDeckModal.savingText}</div>
                            ) : cards.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-xs font-semibold text-slate-400">
                                    {currentDeckId ? UI_TEXT.flashcardDeckModal.emptyCards : UI_TEXT.flashcardDeckModal.noDeckPrompt}
                                </div>
                            ) : (
                                cards.map((card, index) => (
                                    <div key={card.id || index} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/30 p-4">
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                            <span className="text-xs font-extrabold text-slate-800">
                                                {UI_TEXT.flashcardDeckModal.cardTitlePrefix}
                                                {index + 1}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveCard(index)}
                                                className="text-rose-500 hover:text-rose-700"
                                                title={UI_TEXT.flashcardDeckModal.cardRemoveTooltip}
                                            >
                                                <Trash2 className="size-4" />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            <Input
                                                label={
                                                    <span>
                                                        {UI_TEXT.flashcardDeckModal.cardFrontLabel} <span className="font-bold text-red-500">{"*"}</span>
                                                    </span>
                                                }
                                                placeholder={UI_TEXT.flashcardDeckModal.cardFrontPlaceholder}
                                                value={card.front}
                                                onChange={(val) => handleCardChange(index, "front", val)}
                                                size="sm"
                                            />
                                            <Input
                                                label={
                                                    <span>
                                                        {UI_TEXT.flashcardDeckModal.cardBackLabel} <span className="font-bold text-red-500">{"*"}</span>
                                                    </span>
                                                }
                                                placeholder={UI_TEXT.flashcardDeckModal.cardBackPlaceholder}
                                                value={card.back}
                                                onChange={(val) => handleCardChange(index, "back", val)}
                                                size="sm"
                                            />
                                            <Input
                                                label={UI_TEXT.flashcardDeckModal.cardPronunciationLabel}
                                                placeholder={UI_TEXT.flashcardDeckModal.cardPronunciationPlaceholder}
                                                value={card.pronunciation || ""}
                                                onChange={(val) => handleCardChange(index, "pronunciation", val)}
                                                size="sm"
                                            />
                                            <Input
                                                label={UI_TEXT.flashcardDeckModal.cardImageUrlLabel}
                                                placeholder={UI_TEXT.flashcardDeckModal.cardImageUrlPlaceholder}
                                                value={card.imageUrl || ""}
                                                onChange={(val) => handleCardChange(index, "imageUrl", val)}
                                                size="sm"
                                            />
                                            <Input
                                                label={UI_TEXT.flashcardDeckModal.cardAudioUrlLabel}
                                                placeholder={UI_TEXT.flashcardDeckModal.cardAudioUrlPlaceholder}
                                                value={card.audioUrl || ""}
                                                onChange={(val) => handleCardChange(index, "audioUrl", val)}
                                                size="sm"
                                            />
                                        </div>
                                        <TextArea
                                            label={UI_TEXT.flashcardDeckModal.cardExampleLabel}
                                            placeholder={UI_TEXT.flashcardDeckModal.cardExamplePlaceholder}
                                            value={card.example || ""}
                                            onChange={(val) => handleCardChange(index, "example", val)}
                                            rows={exampleRows}
                                        />
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="grid grid-cols-3 gap-3 rounded-b-[24px] border-t border-slate-100 bg-slate-50/60 p-4">
                        <Button type="button" color="secondary-gray" size="md" onClick={onClose} isDisabled={isSaving} className="col-span-1 justify-center">
                            {UI_TEXT.flashcardDeckModal.btnCancel}
                        </Button>
                        <Button
                            color="primary"
                            size="md"
                            type="button"
                            onClick={handleSave}
                            isLoading={isSaving}
                            className="col-span-2 justify-center border-none bg-purple-600 font-bold text-white hover:bg-purple-700"
                        >
                            {currentDeckId ? UI_TEXT.flashcardDeckModal.btnSave : UI_TEXT.flashcardDeckModal.btnCreate}
                        </Button>
                    </div>
                </Dialog>
            </CustomModal.Content>
        </CustomModal.Root>
    );
}
