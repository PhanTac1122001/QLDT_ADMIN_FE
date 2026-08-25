import { CHAR_CODE_CAPITAL_A, DEFAULT_QUESTION_POINTS } from "@/constants/quiz.constants";
import { UI_TEXT } from "@/constants/ui-text.constants";
import type { BlankMock, MatchingPairMock, OptionMock, QuestionKind, QuestionMock, ReorderBlockMock } from "@/types/exam-set.types";
import type { QuestionType, QuizQuestionDto } from "@/types/quiz.types";

const questionTypeLabels: Record<QuestionType, string> = {
    SINGLE_CHOICE: UI_TEXT.examsSetsEl.questionTypeSingle,
    MULTIPLE_CHOICE: UI_TEXT.examsSetsEl.questionTypeMultiple,
    TEXT: UI_TEXT.examsSetsEl.questionTypeText,
    FILL_BLANK: UI_TEXT.examsSetsEl.questionTypeFillBlank,
    MATCHING: UI_TEXT.examsSetsEl.questionTypeMatching,
    REORDER: UI_TEXT.examsSetsEl.questionTypeReorder,
};

export function getQuestionTypeLabel(type: QuestionType): string {
    return questionTypeLabels[type] ?? UI_TEXT.examsSetsEl.questionTypeSingle;
}

/**
 * Chuyển câu hỏi parse từ Excel (QuizQuestionDto) sang QuestionMock để hiển thị
 * và ghép vào danh sách của màn soạn câu hỏi. idPrefix đảm bảo id tạm không trùng.
 */
export function mapImportedQuestionsToUiQuestions(questions: QuizQuestionDto[], idPrefix: string): QuestionMock[] {
    return questions.map((q, qIndex) => {
        const options: OptionMock[] = (q.options || []).map((opt, optIndex) => ({
            id: `${idPrefix}-${qIndex}-${optIndex}`,
            label: String.fromCharCode(CHAR_CODE_CAPITAL_A + optIndex),
            text: opt.content,
            isCorrect: Boolean(opt.isCorrect),
        }));

        // Template Excel có sẵn dòng ví dụ "TEXT" (câu tự luận). KHÔNG được đổi nó
        // thành SINGLE_CHOICE ở đây: câu TEXT không có option, nếu ép về SINGLE_CHOICE
        // thì lần lưu tiếp theo (sync toàn bộ mảng câu hỏi) sẽ gửi lên một câu "trắc
        // nghiệm" 0 đáp án đúng và bị backend từ chối, hỏng cả bộ đề chứ không chỉ câu
        // đó. Giữ nguyên q.type — mapUiQuestionsToBackendDtos đã có nhánh riêng cho TEXT.
        const type: QuestionKind = q.type;

        const blanks: BlankMock[] | undefined = q.blanks?.map((b, bIndex) => ({
            id: `${idPrefix}-${qIndex}-blank-${bIndex}`,
            index: b.index,
            acceptedAnswers: b.acceptedAnswers,
        }));

        const pairs: MatchingPairMock[] | undefined = q.pairs?.map((p, pIndex) => ({
            id: `${idPrefix}-${qIndex}-pair-${pIndex}`,
            left: p.left,
            right: p.right,
        }));

        const blocks: ReorderBlockMock[] | undefined = q.blocks?.map((blk, blkIndex) => ({
            id: `${idPrefix}-${qIndex}-block-${blkIndex}`,
            content: blk.content,
        }));

        return {
            id: `${idPrefix}-${qIndex}`,
            type,
            text: q.content,
            explanation: q.content,
            points: q.points ?? DEFAULT_QUESTION_POINTS,
            options,
            blanks,
            pairs,
            blocks,
        };
    });
}
