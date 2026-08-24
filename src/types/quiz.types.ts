import type { BlankMock, ExamSetMock, MatchingPairMock, OptionMock, QuestionKind, QuestionMock, ReorderBlockMock } from "./exam-set.types";

// 6 dạng câu hỏi backend nhận (DTO). Ở tầng UI, admin FE chỉ soạn được 5 dạng
// (xem QuestionKind trong exam-set.types.ts) — "TEXT" (tự luận) đi qua
// EssayQuestionMock + essay-question-modal.tsx riêng, không qua QuestionMock.
export type QuestionType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TEXT" | "FILL_BLANK" | "MATCHING" | "REORDER";

export interface QuizOptionDto {
    content: string;
    isCorrect: boolean;
}

// Một chỗ trống gửi lên khi tạo/sửa quiz dạng FILL_BLANK.
export interface QuizBlankDto {
    index: number;
    acceptedAnswers: string[];
}

// Một cặp nối gửi lên khi tạo/sửa quiz dạng MATCHING.
export interface QuizMatchingPairDto {
    left: string;
    right: string;
}

// Một khối gửi lên khi tạo/sửa quiz dạng REORDER.
export interface QuizReorderBlockDto {
    content: string;
}

export interface QuizQuestionDto {
    content: string;
    type: QuestionType;
    points?: number;
    options?: QuizOptionDto[];
    timeInVideo?: number;
    blanks?: QuizBlankDto[];
    pairs?: QuizMatchingPairDto[];
    blocks?: QuizReorderBlockDto[];
}

export interface QuizBackendEntity {
    id: string;
    title: string;
    description?: string;
    passThreshold: number;
    courseId?: string;
    questions: Array<{
        _id?: string;
        content: string;
        type: QuestionType;
        points?: number;
        timeInVideo?: number;
        options?: Array<{
            _id?: string;
            content: string;
            isCorrect?: boolean;
        }>;
        // Dữ liệu đọc về từ server, kèm định danh do server sinh (_id, rightId).
        // FE KHÔNG gửi các định danh này lên khi tạo/sửa quiz — backend tự gán,
        // và DTO phía backend dùng whitelist: true nên có gửi cũng bị loại bỏ.
        // Vì vậy QuizBlankDto/QuizMatchingPairDto/QuizReorderBlockDto (payload gửi đi)
        // KHÔNG có các trường _id/rightId — đừng thêm chúng vào đó.
        blanks?: Array<{
            _id?: string;
            index: number;
            acceptedAnswers: string[];
        }>;
        pairs?: Array<{
            _id?: string;
            rightId?: string;
            left: string;
            right: string;
        }>;
        blocks?: Array<{
            _id?: string;
            content: string;
        }>;
    }>;
    createdAt: string;
}

export interface CreateQuizPayload {
    title: string;
    description?: string;
    passThreshold?: number;
    courseId?: string;
    questions: QuizQuestionDto[];
}

export interface QuizImportRowError {
    row: number;
    message: string;
}

export interface QuizImportExcelResponse {
    success: boolean;
    totalImported: number;
    totalErrors: number;
    questions: QuizQuestionDto[];
    errors: QuizImportRowError[];
}

export interface UpdateQuizPayload {
    title?: string;
    description?: string;
    passThreshold?: number;
    courseId?: string;
    questions?: QuizQuestionDto[];
}

const CHAR_CODE_CAPITAL_A = 65;
const DEFAULT_QUESTION_POINTS = 10;

// Hằng số cho các giá trị QuestionType — tránh so sánh trực tiếp bằng chuỗi
// literal viết hoa (bị eslint no-restricted-syntax chặn ở BinaryExpression).
const QUESTION_TYPE_TEXT = "TEXT";
const QUESTION_TYPE_SINGLE_CHOICE = "SINGLE_CHOICE";
const QUESTION_TYPE_MULTIPLE_CHOICE = "MULTIPLE_CHOICE";
const QUESTION_TYPE_FILL_BLANK = "FILL_BLANK";
const QUESTION_TYPE_MATCHING = "MATCHING";
const QUESTION_TYPE_REORDER = "REORDER";

export interface CreateQuizModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (newQuiz: QuizBackendEntity) => void;
    initialData?: ExamSetMock | QuizBackendEntity | null;
}

export function mapBackendQuizToExamSet(quiz: QuizBackendEntity): ExamSetMock {
    const questions: QuestionMock[] = (quiz.questions || []).map((q, qIndex) => {
        const rawOptions = q.options || [];
        const options: OptionMock[] = rawOptions.map((opt, optIndex) => ({
            id: opt._id || `opt_${optIndex}`,
            label: String.fromCharCode(CHAR_CODE_CAPITAL_A + optIndex), // A, B, C, D
            text: opt.content,
            isCorrect: Boolean(opt.isCorrect),
        }));

        // Backend có thể trả "TEXT" (câu tự luận), nhưng QuestionKind (shape UI của
        // question-modal.tsx) không có "TEXT" — modal này chưa bao giờ soạn được câu
        // tự luận (luôn ép đúng 4 đáp án A/B/C/D). Câu tự luận thật sự đi qua
        // EssayQuestionMock + essay-question-modal.tsx riêng, không qua đường này.
        // Map về SINGLE_CHOICE để không phá kiểu, dữ liệu options rỗng vẫn giữ nguyên.
        const type: QuestionKind = q.type === QUESTION_TYPE_TEXT ? QUESTION_TYPE_SINGLE_CHOICE : q.type;

        const blanks: BlankMock[] | undefined = q.blanks?.map((b, bIndex) => ({
            id: b._id || `blank_${bIndex}`,
            index: b.index,
            acceptedAnswers: b.acceptedAnswers,
        }));

        const pairs: MatchingPairMock[] | undefined = q.pairs?.map((p, pIndex) => ({
            id: p._id || `pair_${pIndex}`,
            left: p.left,
            right: p.right,
        }));

        // Giữ nguyên thứ tự mảng trả về — đó chính là thứ tự đúng của dạng REORDER.
        const blocks: ReorderBlockMock[] | undefined = q.blocks?.map((blk, blkIndex) => ({
            id: blk._id || `block_${blkIndex}`,
            content: blk.content,
        }));

        return {
            id: q._id || `q_${qIndex}`,
            type,
            text: q.content,
            explanation: q.content,
            points: q.points || DEFAULT_QUESTION_POINTS,
            options,
            blanks,
            pairs,
            blocks,
        };
    });

    return {
        id: quiz.id,
        name: quiz.title,
        description: quiz.description,
        passThreshold: quiz.passThreshold,
        courseId: quiz.courseId,
        questionCount: questions.length,
        createdAt: quiz.createdAt ? new Date(quiz.createdAt).toLocaleDateString("vi-VN") : new Date().toLocaleDateString("vi-VN"),
        questions,
    };
}

export function mapUiQuestionsToBackendDtos(questions: QuestionMock[]): QuizQuestionDto[] {
    return questions.map((q) => {
        const type: QuestionType = q.type;

        const options: QuizOptionDto[] | undefined =
            type === QUESTION_TYPE_SINGLE_CHOICE || type === QUESTION_TYPE_MULTIPLE_CHOICE
                ? (q.options || [])
                      .filter((o) => o.text && o.text.trim() !== "")
                      .map((o) => ({
                          content: o.text,
                          isCorrect: o.isCorrect,
                      }))
                : undefined;

        const blanks: QuizBlankDto[] | undefined =
            type === QUESTION_TYPE_FILL_BLANK
                ? (q.blanks || [])
                      .map((b) => ({
                          index: b.index,
                          acceptedAnswers: b.acceptedAnswers.filter((a) => a && a.trim() !== ""),
                      }))
                      .filter((b) => b.acceptedAnswers.length > 0)
                : undefined;

        const pairs: QuizMatchingPairDto[] | undefined =
            type === QUESTION_TYPE_MATCHING
                ? (q.pairs || [])
                      .filter((p) => p.left && p.left.trim() !== "" && p.right && p.right.trim() !== "")
                      .map((p) => ({ left: p.left, right: p.right }))
                : undefined;

        const blocks: QuizReorderBlockDto[] | undefined =
            type === QUESTION_TYPE_REORDER
                ? (q.blocks || [])
                      .filter((b) => b.content && b.content.trim() !== "")
                      .map((b) => ({ content: b.content }))
                : undefined;

        return {
            content: q.explanation || q.text,
            type,
            points: q.points || DEFAULT_QUESTION_POINTS,
            options: options && options.length > 0 ? options : undefined,
            blanks: blanks && blanks.length > 0 ? blanks : undefined,
            pairs: pairs && pairs.length > 0 ? pairs : undefined,
            blocks: blocks && blocks.length > 0 ? blocks : undefined,
        };
    });
}
