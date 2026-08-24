export interface OptionMock {
    id: string;
    label: string;
    text: string;
    isCorrect: boolean;
}

// Các dạng câu hỏi mà QuestionMock có thể mang. "TEXT" CÓ mặt ở đây dù modal soạn
// câu hỏi trắc nghiệm (question-modal.tsx) không tạo mới được nó (luôn ép đúng 4
// đáp án A/B/C/D) — vì dữ liệu quiz cũ và câu import từ Excel vẫn sinh ra câu "TEXT"
// thật, và nó phải round-trip qua QuestionMock nguyên vẹn (xem mapBackendQuizToExamSet
// / mapUiQuestionsToBackendDtos ở quiz.types.ts). Ô chọn loại ở question-modal.tsx chỉ
// liệt kê 5 loại tạo mới được, không có "TEXT" trong danh sách tạo mới; câu tự luận
// soạn mới thật sự dùng EssayQuestionMock + essay-question-modal.tsx riêng.
export type QuestionKind = "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "FILL_BLANK" | "MATCHING" | "REORDER" | "TEXT";

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

// Props của lưới đáp án A/B/C/D dùng chung cho SINGLE_CHOICE và MULTIPLE_CHOICE,
// tách ra khỏi question-modal.tsx để chỗ thêm form cho FILL_BLANK/MATCHING/REORDER
// (các task sau) không phải đọc lẫn vào phần logic trắc nghiệm.
export interface ChoiceOptionsFormProps {
    options: OptionMock[];
    isMulti: boolean;
    onSelectCorrect: (index: number) => void;
    onOptionTextChange: (index: number, value: string) => void;
}

// Props của form soạn câu điền từ (FILL_BLANK). `content` là nội dung đề bài (chứa
// marker {{n}}) — chính là state `explanation` của question-modal.tsx, KHÔNG phải
// state riêng, để giữ round-trip content -> explanation ở mapper. `blanks` là danh
// sách chỗ trống hiện tại (đồng bộ theo marker có thật trong `content`, xem
// fill-blank-form.tsx). Cả `content` và `blanks` đều do modal cha sở hữu/điều khiển
// (controlled) để handleSubmit của modal có thể validate và gửi lên đúng shape.
export interface FillBlankFormProps {
    content: string;
    onContentChange: (value: string) => void;
    blanks: BlankMock[];
    onBlanksChange: (blanks: BlankMock[]) => void;
}

// Props của form soạn câu nối cặp (MATCHING). `pairs` do modal cha sở hữu/điều khiển
// (controlled), giống pattern của FillBlankFormProps: modal cha giữ state để
// handleSubmit có thể validate (đủ số cặp tối thiểu, không cặp nào thiếu vế) trước
// khi gửi lên.
export interface MatchingPairsFormProps {
    pairs: MatchingPairMock[];
    onPairsChange: (pairs: MatchingPairMock[]) => void;
}

// Props của form soạn câu sắp xếp block (REORDER). Thứ tự PHẦN TỬ TRONG MẢNG `blocks`
// chính là thứ tự đáp án đúng — component chỉ đổi vị trí phần tử (nút lên/xuống),
// không có state thứ tự riêng.
export interface ReorderBlocksFormProps {
    blocks: ReorderBlockMock[];
    onBlocksChange: (blocks: ReorderBlockMock[]) => void;
}

// Props của khối hiển thị đáp án ở màn chi tiết bộ đề (question-answer-preview.tsx).
// Nhận nguyên `QuestionMock` (không tách lẻ từng field) vì cách render rẽ nhánh hoàn
// toàn theo `question.type` — SINGLE_CHOICE/MULTIPLE_CHOICE giữ nguyên khối
// radio/checkbox hiện có, TEXT không render gì, còn FILL_BLANK/MATCHING/REORDER đọc
// thẳng `blanks`/`pairs`/`blocks` của chính câu hỏi đó.
export interface QuestionAnswerPreviewProps {
    question: QuestionMock;
}
