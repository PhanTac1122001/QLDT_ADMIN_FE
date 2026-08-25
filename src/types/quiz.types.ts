import type { BlankMock, ExamSetMock, MatchingPairMock, OptionMock, QuestionKind, QuestionMock, ReorderBlockMock } from "./exam-set.types";

// 6 dạng câu hỏi backend nhận (DTO). "TEXT" CÓ mặt trong QuestionKind (xem
// exam-set.types.ts) và CÓ round-trip qua QuestionMock — dữ liệu quiz cũ và câu
// import từ Excel sinh ra câu TEXT thật, phải đọc/lưu lại nguyên vẹn qua
// mapBackendQuizToExamSet/mapUiQuestionsToBackendDtos bên dưới. Chỉ riêng ô chọn
// loại ở question-modal.tsx là không cho TẠO MỚI câu TEXT (soạn tự luận mới thật sự
// dùng EssayQuestionMock + essay-question-modal.tsx riêng); sửa một câu TEXT sẵn có
// vẫn đi qua modal này.
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
        // Dữ liệu đọc về từ server, kèm định danh do server sinh (_id, rightId) khi có.
        // FE KHÔNG gửi các định danh này lên khi tạo/sửa quiz — backend tự gán,
        // và DTO phía backend dùng whitelist: true nên có gửi cũng bị loại bỏ.
        // Vì vậy QuizBlankDto/QuizMatchingPairDto/QuizReorderBlockDto (payload gửi đi)
        // KHÔNG có các trường _id/rightId — đừng thêm chúng vào đó.
        //
        // blanks[] KHÔNG có _id: toStaffQuestions ở backend (nhánh FILL_BLANK,
        // question.util.ts) chỉ trả {index, acceptedAnswers} cho mỗi chỗ trống — backend
        // không sinh/tra _id cho blank. Khác với pairs[]/blocks[] bên dưới, nơi backend
        // có trả _id (và rightId cho pairs) thật.
        blanks?: Array<{
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

        // Backend có thể trả "TEXT" (câu tự luận nhập qua Excel hoặc dữ liệu cũ).
        // KHÔNG được đổi nó thành SINGLE_CHOICE ở đây: câu TEXT không có option nào,
        // nếu ép về SINGLE_CHOICE thì lần lưu tiếp theo (sync toàn bộ mảng câu hỏi)
        // sẽ gửi lên một câu "trắc nghiệm" 0 đáp án đúng, bị backend từ chối
        // (assertQuestionBank: "chưa có đáp án đúng nào") — hỏng cả bộ đề, không chỉ
        // câu đó. Giữ nguyên q.type; question-modal.tsx không cho TẠO MỚI câu TEXT
        // nhưng vẫn phải hiển thị/lưu lại đúng câu TEXT đã có.
        const type: QuestionKind = q.type;

        // Backend không trả _id cho blank (xem QuizBackendEntity.blanks[] ở trên) nên
        // luôn tự sinh id cục bộ theo vị trí trong mảng — không có field nào để đọc lại.
        const blanks: BlankMock[] | undefined = q.blanks?.map((b, bIndex) => ({
            id: `blank_${bIndex}`,
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

        // Câu TEXT (tự luận) không có options/blanks/pairs/blocks trong UI, và KHÔNG
        // ĐƯỢC tự chế ra options rỗng cho nó — trông có vẻ là nhánh thừa (question-modal
        // không tạo mới được TEXT) nhưng nó là đường sống sót cho câu TEXT nhập qua
        // Excel hoặc có sẵn từ trước: xoá nhánh này thì bước sync toàn bộ mảng câu hỏi
        // ở lần lưu kế tiếp sẽ gửi một câu "trắc nghiệm" 0 đáp án đúng lên backend,
        // và assertQuestionBank từ chối cả bộ đề ("chưa có đáp án đúng nào"). Backend
        // bỏ qua validate đáp án khi type === TEXT nên chỉ cần gửi đúng content/points.
        if (type === QUESTION_TYPE_TEXT) {
            return {
                content: q.explanation || q.text,
                type,
                points: q.points || DEFAULT_QUESTION_POINTS,
            };
        }

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
                ? (q.blocks || []).filter((b) => b.content && b.content.trim() !== "").map((b) => ({ content: b.content }))
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
