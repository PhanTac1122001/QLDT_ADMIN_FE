export interface OptionMock {
    id: string;
    label: string;
    text: string;
    isCorrect: boolean;
}

// Các dạng câu hỏi mà admin FE hỗ trợ soạn/hiển thị.
// Lưu ý: KHÔNG có "TEXT" ở đây — modal soạn câu hỏi trắc nghiệm (question-modal.tsx)
// chưa bao giờ soạn được câu tự luận (luôn ép đúng 4 đáp án A/B/C/D).
// Câu tự luận dùng EssayQuestionMock + essay-question-modal.tsx riêng.
// Backend vẫn nhận "TEXT" nên QuestionType ở quiz.types.ts (tầng DTO) vẫn giữ đủ 6 giá trị.
export type QuestionKind =
    | "SINGLE_CHOICE"
    | "MULTIPLE_CHOICE"
    | "FILL_BLANK"
    | "MATCHING"
    | "REORDER";

// Một chỗ trống trong dạng bài "điền từ" (FILL_BLANK).
export interface BlankMock {
    id: string;
    index: number; // khớp marker {{n}} trong đề bài
    acceptedAnswers: string[]; // nhiều đáp án chấp nhận được cho một chỗ trống
}

// Một cặp nối trong dạng bài "nối cặp" (MATCHING).
export interface MatchingPairMock {
    id: string;
    left: string;
    right: string;
}

// Một khối trong dạng bài "sắp xếp" (REORDER).
export interface ReorderBlockMock {
    id: string;
    content: string; // thứ tự PHẦN TỬ TRONG MẢNG = thứ tự đúng
}

export interface QuestionMock {
    id: string;
    text: string;
    explanation: string;
    points: number;
    options: OptionMock[];
    // Bắt buộc (không optional): nếu để optional, chỗ nào quên điền sẽ âm thầm
    // rơi về SINGLE_CHOICE qua nhánh suy luận cũ trong mapper. Để bắt buộc thì
    // TypeScript chỉ ra hết mọi nơi cần sửa khi thêm dạng bài mới.
    type: QuestionKind;
    blanks?: BlankMock[]; // chỉ có khi type === "FILL_BLANK"
    pairs?: MatchingPairMock[]; // chỉ có khi type === "MATCHING"
    blocks?: ReorderBlockMock[]; // chỉ có khi type === "REORDER"
}

export interface TestCaseMock {
    input: string;
    output: string;
}

export interface EssayQuestionMock {
    id: string;
    title: string;
    language: string;
    functionName: string;
    detail: string;
    templateCode: string;
    testCases: TestCaseMock[];
    points: number;
}

export interface ExamSetMock {
    id: string;
    name: string;
    description?: string;
    passThreshold?: number;
    courseId?: string;
    questionCount: number;
    createdAt: string;
    questions: QuestionMock[];
    essayQuestions?: EssayQuestionMock[];
}

export interface ExamSetDetailViewProps {
    id: string;
}

export interface ExamSetDetailClientViewProps {
    id: string;
}

export interface QuestionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (question: QuestionMock) => void;
    question?: QuestionMock | null;
}
