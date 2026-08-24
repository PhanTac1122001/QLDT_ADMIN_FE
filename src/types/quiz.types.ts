import type { ExamSetMock, OptionMock, QuestionMock } from "./exam-set.types";

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

        return {
            id: q._id || `q_${qIndex}`,
            text: q.content,
            explanation: q.content,
            points: q.points || DEFAULT_QUESTION_POINTS,
            options,
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
        const correctCount = (q.options || []).filter((o) => o.isCorrect).length;
        let type: QuestionType = "SINGLE_CHOICE";
        if (correctCount > 1) {
            type = "MULTIPLE_CHOICE";
        } else if (!q.options || q.options.length === 0) {
            type = "TEXT";
        }

        const options: QuizOptionDto[] = (q.options || [])
            .filter((o) => o.text && o.text.trim() !== "")
            .map((o) => ({
                content: o.text,
                isCorrect: o.isCorrect,
            }));

        return {
            content: q.explanation || q.text,
            type,
            points: q.points || DEFAULT_QUESTION_POINTS,
            options: options.length > 0 ? options : undefined,
        };
    });
}
