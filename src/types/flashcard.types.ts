export interface FlashcardCard {
    id?: string;
    _id?: string;
    front: string;
    back: string;
    pronunciation?: string;
    example?: string;
    imageUrl?: string;
    audioUrl?: string;
    position?: number;
}

export interface FlashcardDeck {
    id: string;
    name: string;
    description?: string;
    courseId?: string;
    language?: string;
    status: boolean;
    cards: FlashcardCard[];
    cardCount: number;
    createdAt: string;
}

export interface FlashcardDeckSummary {
    id: string;
    name: string;
    description?: string;
    courseId?: string;
    language?: string;
    status: boolean;
    cardCount: number;
    createdAt: string;
}

export interface CreateFlashcardDeckPayload {
    name: string;
    description?: string;
    courseId?: string;
    language?: string;
    status?: boolean;
    cards?: FlashcardCard[];
}

export type UpdateFlashcardDeckPayload = Partial<Omit<CreateFlashcardDeckPayload, "cards">>;

export interface ImportFlashcardExcelError {
    row: number;
    reason: string;
}

export interface ImportFlashcardExcelResponse {
    deckId: string;
    imported: number;
    skipped: number;
    errors: ImportFlashcardExcelError[];
}

export interface FlashcardDeckModalProps {
    isOpen: boolean;
    onClose: () => void;
    sessionId?: string;
    deckId?: string;
    courseId?: string;
    onChanged: (deckId: string | undefined) => void;
}
