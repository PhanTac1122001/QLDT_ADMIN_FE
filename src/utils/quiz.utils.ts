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

        // Excel có thể khai "TEXT" (câu tự luận), nhưng QuestionKind (shape UI của
        // question-modal.tsx) không có "TEXT" — câu tự luận đi qua EssayQuestionMock +
        // essay-question-modal.tsx riêng, không nạp qua đường import trắc nghiệm này.
        const type: QuestionKind = q.type === "TEXT" ? "SINGLE_CHOICE" : q.type;

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
