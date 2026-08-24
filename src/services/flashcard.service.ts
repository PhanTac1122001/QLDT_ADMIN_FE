import { API_ENDPOINTS } from "@/constants/api-endpoints.constants";
import { FLASHCARD_TEMPLATE_FILENAME } from "@/constants/quiz.constants";
import { httpClient } from "@/lib/http-client";
import { HttpMethod } from "@/types/api-types";
import type {
    CreateFlashcardDeckPayload,
    FlashcardCard,
    FlashcardDeck,
    FlashcardDeckSummary,
    ImportFlashcardExcelResponse,
    UpdateFlashcardDeckPayload,
} from "@/types/flashcard.types";
import { downloadFileFromApi } from "@/utils/download.utils";

export async function getFlashcardDecks(params: { courseId?: string; search?: string } = {}): Promise<FlashcardDeckSummary[]> {
    const searchParams = new URLSearchParams();
    if (params.courseId) searchParams.set("courseId", params.courseId);
    if (params.search) searchParams.set("search", params.search);

    const queryString = searchParams.toString();
    const url = queryString ? `${API_ENDPOINTS.FLASHCARD_DECK.BASE}?${queryString}` : API_ENDPOINTS.FLASHCARD_DECK.BASE;

    const res = await httpClient<any>(url, { method: HttpMethod.GET });
    const result = res?.data ?? res;
    return Array.isArray(result) ? result : [];
}

export async function getFlashcardDeckById(id: string): Promise<FlashcardDeck> {
    const res = await httpClient<any>(API_ENDPOINTS.FLASHCARD_DECK.BY_ID(id), { method: HttpMethod.GET });
    return res?.data ?? res;
}

export async function createFlashcardDeck(payload: CreateFlashcardDeckPayload): Promise<FlashcardDeck> {
    const res = await httpClient<any>(API_ENDPOINTS.FLASHCARD_DECK.BASE, {
        method: HttpMethod.POST,
        body: JSON.stringify(payload),
    });
    return res?.data ?? res;
}

export async function updateFlashcardDeck(id: string, payload: UpdateFlashcardDeckPayload): Promise<FlashcardDeck> {
    const res = await httpClient<any>(API_ENDPOINTS.FLASHCARD_DECK.BY_ID(id), {
        method: HttpMethod.PATCH,
        body: JSON.stringify(payload),
    });
    return res?.data ?? res;
}

export async function deleteFlashcardDeck(id: string): Promise<void> {
    await httpClient<void>(API_ENDPOINTS.FLASHCARD_DECK.BY_ID(id), { method: HttpMethod.DELETE });
}

export async function addFlashcardCard(deckId: string, card: FlashcardCard): Promise<FlashcardDeck> {
    const res = await httpClient<any>(API_ENDPOINTS.FLASHCARD_DECK.CARDS(deckId), {
        method: HttpMethod.POST,
        body: JSON.stringify(card),
    });
    return res?.data ?? res;
}

export async function updateFlashcardCard(deckId: string, cardId: string, card: Partial<FlashcardCard>): Promise<FlashcardDeck> {
    const res = await httpClient<any>(API_ENDPOINTS.FLASHCARD_DECK.CARD_BY_ID(deckId, cardId), {
        method: HttpMethod.PATCH,
        body: JSON.stringify(card),
    });
    return res?.data ?? res;
}

export async function deleteFlashcardCard(deckId: string, cardId: string): Promise<FlashcardDeck> {
    const res = await httpClient<any>(API_ENDPOINTS.FLASHCARD_DECK.CARD_BY_ID(deckId, cardId), {
        method: HttpMethod.DELETE,
    });
    return res?.data ?? res;
}

export async function reorderFlashcardCards(deckId: string, cardIds: string[]): Promise<FlashcardDeck> {
    const res = await httpClient<any>(API_ENDPOINTS.FLASHCARD_DECK.REORDER(deckId), {
        method: HttpMethod.PATCH,
        body: JSON.stringify({ cardIds }),
    });
    return res?.data ?? res;
}

export async function importFlashcardExcel(sessionId: string, file: File, deckName?: string): Promise<ImportFlashcardExcelResponse> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("sessionId", sessionId);
    if (deckName) formData.append("deckName", deckName);

    const res = await httpClient<any>(API_ENDPOINTS.FLASHCARD_DECK.IMPORT_EXCEL, {
        method: HttpMethod.POST,
        body: formData,
    });
    return res?.data ?? res;
}

export async function downloadFlashcardTemplate(): Promise<void> {
    return downloadFileFromApi(API_ENDPOINTS.FLASHCARD_DECK.EXCEL_TEMPLATE, FLASHCARD_TEMPLATE_FILENAME);
}
