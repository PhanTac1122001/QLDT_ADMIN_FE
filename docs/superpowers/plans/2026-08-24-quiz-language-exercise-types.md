# Soạn 3 dạng bài tập ngoại ngữ trong admin FE — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Cho staff soạn được `FILL_BLANK` (điền từ), `MATCHING` (nối cặp), `REORDER` (sắp xếp block) trong bộ đề quiz — gồm form soạn, hiển thị ở màn chi tiết, và import Excel.

**Architecture:** Thêm `type` tường minh vào shape UI `QuestionMock` (thay cho việc suy loại từ số đáp án đúng), tách mỗi dạng thành một component form riêng để `question-modal.tsx` chỉ còn lo chọn loại + field dùng chung, và rẽ nhánh render theo `type` ở màn chi tiết.

**Tech Stack:** Next.js App Router, TypeScript, react-aria-components, Tailwind v4, react-query, Tiptap. Không có thư viện DnD.

**Spec:** [docs/superpowers/specs/2026-08-24-quiz-language-exercise-types-design.md](../specs/2026-08-24-quiz-language-exercise-types-design.md)
**Hợp đồng backend:** repo `lms-portal-api`, nhánh `feat/quiz-language-exercise-types`, spec `2026-08-20-language-exercise-types-design.md`.

---

## Trước khi bắt đầu — quy ước repo (BẮT BUỘC)

- Working dir: `C:\Users\ADMIN\Desktop\New folder\QLDT_ADMIN_FE`. Nhánh: `feat/quiz-language-exercise-types`.
- **Repo KHÔNG có unit test** cho màn CRUD. Cổng verify là 3 lệnh, cả 3 phải sạch:
  - `npm run type-check`
  - `npx eslint src --max-warnings=0`
  - `npm run build`

  ⚠️ **KHÔNG dùng `npm run lint:check`** — nó chạy `eslint .` nên quét cả thư mục
  `deploy/.next/` (build output còn sót lại trong repo) và báo **279.155 lỗi/cảnh báo
  sẵn có** không liên quan tới code nguồn. Đo lúc bắt đầu: `npx eslint src
  --max-warnings=0` exit 0, `npm run type-check` sạch — đó là baseline thật.
- **ESLint rất nghiêm** trong `src/components` và `src/views`: cấm chuỗi tiếng Việt hardcode (phải lấy từ `UI_TEXT`), cấm hex literal thô, cấm magic number, cấm hằng UPPER_CASE, cấm khai `interface`/`type` inline (đưa ra `src/types/*.ts`).
- Hằng số dùng chung để ở `src/constants/*` (đã có `src/constants/quiz.constants.ts`).
- Pre-commit hook chạy `type-check` — commit sẽ fail nếu type sai.
- Toast: `import { toast } from "@/services/toast.service"`.
- **Bẫy `_id` vs `id`:** object lồng từ BE chỉ có `_id`, không có `id`. Luôn đọc `obj?._id || obj?.id`.

## Bối cảnh phải nắm trước khi sửa

**Round-trip `explanation`/`text` — CỐ Ý giữ nguyên, đừng "sửa cho đúng tên":**
`mapBackendQuizToExamSet` gán `explanation = q.content` (trùng hệt `text`), rồi
`mapUiQuestionsToBackendDtos` đọc ngược `content = q.explanation || q.text`. Trường tên
"giải thích" thật ra đang giữ **nội dung câu hỏi**. Phá quan hệ này = mất nội dung câu
hỏi của mọi quiz cũ.

**`TiptapEditor` phát ra markdown (không phải HTML) và không expose editor instance.**

---

### Task 1: Kiểu dữ liệu + hằng số

**Files:**
- Modify: `src/types/exam-set.types.ts`
- Modify: `src/types/quiz.types.ts`
- Modify: `src/constants/quiz.constants.ts`

- [ ] **Step 1: `exam-set.types.ts`** — thêm `QuestionKind`, `BlankMock`, `MatchingPairMock`, `ReorderBlockMock` theo đúng §3.1 của spec; `QuestionMock` thêm `type: QuestionKind` (**bắt buộc**) và `blanks?`/`pairs?`/`blocks?`.

- [ ] **Step 2: `quiz.types.ts`** — mở `QuestionType` lên 6 giá trị; thêm `QuizBlankDto`/`QuizMatchingPairDto`/`QuizReorderBlockDto`; `QuizQuestionDto` thêm `blanks?`/`pairs?`/`blocks?`; `QuizBackendEntity.questions[]` thêm ba field đó ở dạng đọc về (kèm `_id`, và `rightId` cho pair).

- [ ] **Step 3: `quiz.constants.ts`** — thêm hằng cần cho form: số cặp nối tối thiểu (2), số block tối thiểu (2), số blank tối thiểu (1), regex marker `{{n}}`. Không để magic number rải rác trong component.

- [ ] **Step 4: Verify** — `npm run type-check` sẽ **báo lỗi ở 3 chỗ tạo `QuestionMock`** (`mapBackendQuizToExamSet`, `question-modal.tsx`, `mapImportedQuestionsToUiQuestions`) vì thiếu `type`. Đó là kỳ vọng, Task 2 và 3 sẽ vá. Ghi lại danh sách lỗi vào báo cáo.

- [ ] **Step 5: Commit** — `feat(quiz): kieu du lieu cho 3 dang bai tap moi`

---

### Task 2: Mapper — bỏ suy luận loại

**Files:**
- Modify: `src/types/quiz.types.ts` (2 hàm mapper ở cuối file)
- Modify: `src/utils/quiz.utils.ts`

- [ ] **Step 1: `mapBackendQuizToExamSet`** — set `type: q.type` (ép về `QuestionKind`; nếu BE trả `TEXT` thì map về `SINGLE_CHOICE` vì modal không soạn được tự luận — ghi comment giải thích). Map `blanks`/`pairs`/`blocks` sang shape UI, sinh `id` từ `_id` theo đúng pattern `opt._id || \`opt_${i}\`` sẵn có.

- [ ] **Step 2: `mapUiQuestionsToBackendDtos`** — **xoá nhánh suy loại**, đọc thẳng `q.type`. Chỉ gửi `options` cho `SINGLE_CHOICE`/`MULTIPLE_CHOICE`; gửi `blanks`/`pairs`/`blocks` cho đúng dạng, **không gửi chéo**. Giữ nguyên `content: q.explanation || q.text`.

- [ ] **Step 3: `quiz.utils.ts`** — `questionTypeLabels` thêm nhãn cho 3 loại mới; `mapImportedQuestionsToUiQuestions` mang theo `type` và 3 field mới.

- [ ] **Step 4: Verify** — `npm run type-check` chỉ còn báo lỗi ở `question-modal.tsx` (Task 4 vá).

- [ ] **Step 5: Commit** — `feat(quiz): mapper doc type tuong minh thay vi suy luan`

---

### Task 3: Chuỗi UI_TEXT

**Files:** Modify `src/constants/ui-text.constants.ts` (nhóm `examsSetsEl`, quanh dòng 1938)

- [ ] **Step 1** — Thêm mọi chuỗi tiếng Việt cần cho 3 dạng mới: nhãn ô chọn loại + 5 mục loại; nhãn/placeholder cho form điền từ (gồm nút "Chèn chỗ trống", nhãn danh sách đáp án chấp nhận), form nối cặp (vế trái/vế phải, thêm/xoá cặp), form sắp xếp (thêm/xoá block, di chuyển lên/xuống); nhãn hiển thị ở màn chi tiết cho từng dạng; thông báo lỗi validate của từng dạng.

  Đặt tên khoá theo đúng phong cách sẵn có (`labelXxx`, `placeholderXxx`, `btnXxx`, `toastXxx`). **Đọc quanh dòng 1938–2060 trước** để theo đúng giọng văn và cách đặt tên.

- [ ] **Step 2: Verify** — `npm run type-check` + `npm run lint:check`.

- [ ] **Step 3: Commit** — `feat(quiz): chuoi giao dien cho 3 dang bai tap moi`

---

### Task 4: Tách form trắc nghiệm + thêm ô chọn loại

**Files:**
- Create: `src/components/application/modals/question-forms/choice-options-form.tsx`
- Modify: `src/components/application/modals/question-modal.tsx`
- Modify: `src/types/exam-set.types.ts` (props type cho form con)

Mục tiêu task này: **không thêm dạng mới nào**, chỉ tái cấu trúc để chỗ thêm dạng mới trở nên hiển nhiên — và chứng minh dạng trắc nghiệm cũ vẫn chạy y hệt.

- [ ] **Step 1** — Rút toàn bộ phần lưới đáp án A/B/C/D (hiện ở `question-modal.tsx` L178–232) ra `choice-options-form.tsx`, nhận props `{ options, isMulti, onSelectCorrect, onOptionTextChange }`. Props type khai ở `src/types/exam-set.types.ts`.

- [ ] **Step 2** — Thêm ô chọn loại ở đầu form, 5 mục (`SINGLE_CHOICE`, `MULTIPLE_CHOICE`, `FILL_BLANK`, `MATCHING`, `REORDER`). Dùng component select sẵn có ở `src/components/base/select` (đọc trước để biết API).

- [ ] **Step 3** — Bỏ toggle "1 đáp án đúng / Nhiều đáp án đúng" ở footer; `isMulti` giờ suy ra từ `type === "MULTIPLE_CHOICE"`. Footer chỉ còn Huỷ/Lưu.
  Khi đổi từ `MULTIPLE_CHOICE` sang `SINGLE_CHOICE`, giữ đúng hành vi `handleToggleMulti(false)` hiện có (chỉ giữ đáp án đúng đầu tiên).

- [ ] **Step 4** — `handleSubmit` gán `type` vào `QuestionMock`. `useEffect` nạp lại khi sửa câu hỏi phải set `type` từ `question.type`.

- [ ] **Step 5: BỎ `required` trên 4 textarea đáp án.** Chúng đang `required` (L227), nên khi chọn dạng mới mà lưới đáp án bị ẩn, form vẫn submit được. Thay bằng validate thủ công trong `handleSubmit` (đã có sẵn pattern dùng `toast.error`).

- [ ] **Step 6: Verify** — 3 cổng. Rồi **mở browser kiểm tay**: tạo câu trắc nghiệm 1 đáp án đúng và nhiều đáp án đúng, sửa lại, xác nhận lưu được và hiển thị đúng như trước.

- [ ] **Step 7: Commit** — `refactor(quiz): tach form trac nghiem va them o chon loai cau hoi`

---

### Task 5: Form điền từ

**Files:**
- Create: `src/components/application/modals/question-forms/fill-blank-form.tsx`
- Modify: `src/components/application/modals/question-modal.tsx`
- Modify: `src/types/exam-set.types.ts`

- [ ] **Step 1: Ô đề bài dùng `<textarea>` thay `TiptapEditor` — CHỈ cho dạng này.**
  Lý do (ghi comment vào code): nút "Chèn chỗ trống" cần `selectionStart` để chèn `{{n}}` đúng vị trí con trỏ; `TiptapEditor` không expose editor instance, mà sửa component dùng chung đó thì ảnh hưởng cả màn bài đọc/bài học. Giá trị vẫn là chuỗi nên không phá round-trip `explanation`.

- [ ] **Step 2: Nút "Chèn chỗ trống"** — chèn `{{n}}` tại con trỏ với `n` là **số nhỏ nhất chưa dùng** trong đề (không phải `blanks.length + 1` — staff có thể đã xoá chỗ trống ở giữa).

- [ ] **Step 3: Đồng bộ blank theo marker có thật trong đề.** Nguồn sự thật là **nội dung đề**, không phải mảng `blanks`: parse marker từ đề → blank nào không còn marker thì biến mất, marker mới thì sinh dòng nhập đáp án rỗng. Giữ lại đáp án đã nhập của các blank còn tồn tại (khoá theo `index`, không theo vị trí mảng).

- [ ] **Step 4: Mỗi blank nhập được nhiều đáp án chấp nhận được** — danh sách ô nhập, có nút thêm/xoá.

- [ ] **Step 5: Validate trong `handleSubmit`** (chặn trước để staff không phải đoán lỗi 400 từ backend):
  - ≥1 chỗ trống
  - mỗi blank có ≥1 đáp án không rỗng
  - **không có marker trùng số** trong đề
  - tập số marker khớp đúng tập `blanks[].index`

  Backend `assertQuestionBank` áp đúng các luật này; sai thì trả 400 khó hiểu.

- [ ] **Step 6: Verify** — 3 cổng + browser: soạn câu điền từ 2 chỗ trống, mỗi chỗ 2 đáp án; xoá một marker giữa chừng, xác nhận dòng đáp án tương ứng biến mất còn dòng kia giữ nguyên nội dung; lưu và mở lại để sửa.

- [ ] **Step 7: Commit** — `feat(quiz): form soan cau dien tu`

---

### Task 6: Form nối cặp

**Files:**
- Create: `src/components/application/modals/question-forms/matching-pairs-form.tsx`
- Modify: `src/components/application/modals/question-modal.tsx`
- Modify: `src/types/exam-set.types.ts`

- [ ] **Step 1** — Bảng 2 cột: mỗi dòng gồm ô vế trái + ô vế phải + nút xoá dòng. Nút "Thêm cặp" ở cuối. Mặc định 2 dòng rỗng khi tạo mới.

- [ ] **Step 2: Validate** — ≥2 cặp; cả hai vế đều không rỗng.

- [ ] **Step 3: Verify** — 3 cổng + browser: soạn câu nối 3 cặp, xoá 1 cặp, lưu, mở lại sửa.

- [ ] **Step 4: Commit** — `feat(quiz): form soan cau noi cap`

---

### Task 7: Form sắp xếp block

**Files:**
- Create: `src/components/application/modals/question-forms/reorder-blocks-form.tsx`
- Modify: `src/components/application/modals/question-modal.tsx`
- Modify: `src/types/exam-set.types.ts`

- [ ] **Step 1** — Danh sách block nhập **theo đúng thứ tự đáp án**. Mỗi dòng: ô nhập + nút ↑ + nút ↓ + nút xoá. Nút "Thêm block". Mặc định 2 dòng rỗng.
  Nút ↑ ở dòng đầu và ↓ ở dòng cuối phải bị `disabled` (đừng ẩn — ẩn làm layout nhảy).

- [ ] **Step 2** — Ghi rõ trên giao diện rằng thứ tự đang nhập **là đáp án đúng**, học viên sẽ thấy thứ tự bị xáo trộn. Không nói ra thì staff dễ tưởng phải tự xáo.

- [ ] **Step 3: Validate** — ≥2 block; nội dung không rỗng.

- [ ] **Step 4: Verify** — 3 cổng + browser: soạn câu 4 block, dùng ↑↓ đổi thứ tự, xoá 1 block, lưu, mở lại sửa và xác nhận thứ tự giữ nguyên.

- [ ] **Step 5: Commit** — `feat(quiz): form soan cau sap xep block`

---

### Task 8: Hiển thị ở màn chi tiết bộ đề

**Files:**
- Create: `src/components/application/exam-sets/question-answer-preview.tsx`
- Modify: `src/views/exams-sets/exam-set-detail-view.tsx`
- Modify: `src/types/exam-set.types.ts`

- [ ] **Step 1** — Rút phần render đáp án hiện tại (`exam-set-detail-view.tsx` L416–455, radio/checkbox theo `options`) ra component mới, rồi rẽ nhánh theo `q.type`:
  - **Trắc nghiệm:** giữ nguyên hành vi hiện tại
  - **Điền từ:** hiện đề với marker `{{n}}` được tô nổi bật, kèm danh sách đáp án chấp nhận theo từng chỗ trống
  - **Nối cặp:** bảng cặp trái → phải
  - **Sắp xếp:** chuỗi block đánh số theo thứ tự đúng

- [ ] **Step 2** — Badge loại câu hỏi trên mỗi card, dùng `getQuestionTypeLabel`.

- [ ] **Step 3: Verify** — 3 cổng + browser: mở bộ đề có đủ 5 loại, xác nhận từng loại hiển thị đúng và không loại nào hiện ô rỗng.

- [ ] **Step 4: Commit** — `feat(quiz): hien thi 3 dang bai tap moi o man chi tiet bo de`

---

### Task 9: Preview import Excel

**Files:** Modify `src/components/application/modals/create-quiz-modal.tsx`

- [ ] **Step 1** — Preview danh sách câu import (L54–120) hiện chỉ hiểu `options`. Dùng lại component ở Task 8 để hiển thị đúng 3 dạng mới. Nếu component đó quá nặng cho preview thì hiển thị tóm tắt gọn (vd "3 cặp nối", "4 block") — **giải trình lựa chọn trong báo cáo**.

- [ ] **Step 2** — Hiển thị nhãn loại cho từng câu import (`getQuestionTypeLabel`).

- [ ] **Step 3: Verify** — 3 cổng + browser: tải template Excel từ nút sẵn có, import lại chính file đó (template backend đã có ví dụ đủ 6 loại), xác nhận preview hiện đúng từng loại và không có lỗi dòng nào.

- [ ] **Step 4: Commit** — `feat(quiz): preview import excel hieu 3 dang bai tap moi`

---

### Task 10: Xác minh tổng + đối chiếu hợp đồng backend

- [ ] **Step 1** — Chạy đủ 3 cổng lần cuối: `npm run type-check`, `npm run lint:check`, `npm run build`.

- [ ] **Step 2: Kiểm đầu-cuối trên browser với backend thật.**
  ⚠️ `.env` mặc định trỏ API sang **staging `103.118.29.137`**, nơi backend P1 **chưa deploy** → endpoint mới sẽ 404 hoặc từ chối 3 dạng mới. Dòng localhost đã có sẵn dạng comment trong `.env`. Muốn kiểm thật thì trỏ về localhost và chạy backend ở `C:\Users\ADMIN\Desktop\lms-portal-api` (nhánh `feat/quiz-language-exercise-types`).
  Kịch bản: tạo bộ đề mới → thêm 1 câu mỗi loại (5 loại) → lưu → tải lại trang → mở sửa từng câu → xác nhận dữ liệu khớp.

- [ ] **Step 3** — Cập nhật trạng thái spec, ghi lại phần đã kiểm và phần chưa kiểm được.

- [ ] **Step 4: Commit** — `docs: danh dau P2 hoan thanh`

---

## Sau khi xong

- **P3** — app học viên: render + kéo-thả làm bài + submit. Repo chưa xác định.
- Nợ kỹ thuật kế thừa từ backend: đường học cũ (`Lesson.quizId`) vẫn không chấm được 3 dạng mới; đã có 4 hàng rào chặn, xem spec backend §14.
