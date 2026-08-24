# Thiết kế: Soạn 3 dạng bài tập ngoại ngữ trong admin FE (P2)

- **Ngày:** 2026-08-24
- **Trạng thái:** Đã chốt với người dùng — sẵn sàng lập plan
- **Repo:** `QLDT_ADMIN_FE`, nhánh `feat/quiz-language-exercise-types`
- **Phụ thuộc:** backend P1 đã xong ở `lms-portal-api` nhánh cùng tên. Hợp đồng API xem `docs/superpowers/specs/2026-08-20-language-exercise-types-design.md` của repo đó.

## 1. Mục tiêu

Cho phép staff soạn 3 dạng bài tập mới trong bộ đề quiz:
- `FILL_BLANK` — điền vào chỗ trống, đánh dấu bằng marker `{{n}}` trong đề
- `MATCHING` — nối cặp
- `REORDER` — sắp xếp block thành câu hoàn chỉnh

Gồm: form soạn, hiển thị ở màn chi tiết bộ đề, và luồng import Excel.

**Ngoài phạm vi:** app học viên (P3, repo khác) — kéo-thả để làm bài nằm ở đó, không phải ở đây.

## 2. Hiện trạng cần biết trước khi sửa

**Không có chỗ chọn loại câu hỏi.** `question-modal.tsx` chỉ có toggle 2 nút ở footer
("1 đáp án đúng" / "Nhiều đáp án đúng" → state `isMulti`). Loại backend được **suy ra
lúc lưu** trong `mapUiQuestionsToBackendDtos`: >1 đáp án đúng → `MULTIPLE_CHOICE`,
không có option → `TEXT`, còn lại → `SINGLE_CHOICE`.

**Shape UI không biểu diễn được 3 dạng mới.** `QuestionMock` là
`{id, text, explanation, points, options}`; `OptionMock` chỉ có `text`/`isCorrect` —
không có chỗ cho cặp nối hay thứ tự block.

**Repo không có thư viện kéo-thả nào.** Chỗ nào cần thì dùng HTML5 `draggable` thuần
(xem `type-detail-course-view.tsx`, `session-node.tsx`). Đây là lý do phần soạn bài
được thiết kế **không cần kéo-thả** — xem §5.3.

**`TiptapEditor` phát ra markdown, không phải HTML**, và **không expose editor
instance** (props chỉ có `value`/`onChange`/`placeholder`/`readOnly`/`hideToolbar`/
`className`/`editorClassName`/`onImageUpload`/`onBlur`). Hệ quả trực tiếp ở §5.1.

**Nợ sẵn có, CỐ Ý không sửa:** `mapBackendQuizToExamSet` gán `explanation = q.content`
(trùng hệt `text`), rồi `mapUiQuestionsToBackendDtos` đọc ngược
`content = q.explanation || q.text`. Tức trường tên "giải thích" thật ra đang giữ
**nội dung câu hỏi**. Round-trip vẫn đúng nên giữ nguyên để không phá dữ liệu cũ.
Mọi thay đổi dưới đây phải bảo toàn round-trip này.

## 3. Kiểu dữ liệu

### 3.1. Shape UI (`src/types/exam-set.types.ts`)

```ts
export type QuestionKind =
    | "SINGLE_CHOICE"
    | "MULTIPLE_CHOICE"
    | "FILL_BLANK"
    | "MATCHING"
    | "REORDER";

export interface BlankMock {
    id: string;
    index: number; // khớp marker {{n}} trong đề
    acceptedAnswers: string[]; // nhiều đáp án chấp nhận được cho một chỗ trống
}

export interface MatchingPairMock {
    id: string;
    left: string;
    right: string;
}

export interface ReorderBlockMock {
    id: string;
    content: string; // thứ tự PHẦN TỬ TRONG MẢNG = thứ tự đúng
}

export interface QuestionMock {
    id: string;
    type: QuestionKind; // BẮT BUỘC — xem §3.3
    text: string;
    explanation: string;
    points: number;
    options: OptionMock[];
    blanks?: BlankMock[];
    pairs?: MatchingPairMock[];
    blocks?: ReorderBlockMock[];
}
```

`TEXT` **không** có trong `QuestionKind`: modal này chưa bao giờ soạn được câu tự luận
(luôn ép đúng 4 đáp án), câu tự luận có `essay-question-modal` riêng. Backend vẫn nhận
`TEXT` nên `QuestionType` ở tầng DTO giữ đủ 6 giá trị.

### 3.2. Shape DTO backend (`src/types/quiz.types.ts`)

```ts
export type QuestionType =
    | "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TEXT"
    | "FILL_BLANK" | "MATCHING" | "REORDER";

export interface QuizBlankDto { index: number; acceptedAnswers: string[] }
export interface QuizMatchingPairDto { left: string; right: string }
export interface QuizReorderBlockDto { content: string }
```

`QuizQuestionDto` thêm `blanks?`/`pairs?`/`blocks?`.
`QuizBackendEntity.questions[]` thêm ba field đó ở dạng đọc về, kèm định danh do server
sinh: `blanks[]._id`, `pairs[]._id`, `pairs[].rightId`, `blocks[]._id`.

**FE KHÔNG gửi `_id`/`rightId` lên.** Backend tự gán (`assertQuestionBank`), và DTO của
nó dùng `whitelist: true` nên có gửi cũng bị loại. Hệ quả đã biết: mỗi lần sửa quiz,
server sinh định danh mới — đúng bằng hành vi hiện hành của `options._id`, không phải
thụt lùi.

### 3.3. Vì sao `type` bắt buộc chứ không optional

Nếu optional, mọi chỗ quên điền sẽ **âm thầm** rơi về `SINGLE_CHOICE` qua nhánh suy
luận cũ. Để bắt buộc thì TypeScript chỉ ra hết mọi nơi đang tạo `QuestionMock`
(`mapBackendQuizToExamSet`, `question-modal`, `mapImportedQuestionsToUiQuestions`, và
dữ liệu mock) để điền tường minh. Đây là bài học rút từ P1: 8 vòng review ở backend,
lỗi lặp lại nhiều lần đều có dạng "một nhánh quên phân loại mà không ai thấy".

## 4. Mapper — bỏ suy luận, đọc type tường minh

`mapUiQuestionsToBackendDtos` hiện suy loại từ số đáp án đúng. Đổi thành:
- đọc thẳng `q.type`
- chỉ gửi `options` cho `SINGLE_CHOICE`/`MULTIPLE_CHOICE`
- gửi `blanks`/`pairs`/`blocks` cho đúng dạng tương ứng, không gửi chéo

`mapBackendQuizToExamSet` set `type` từ `q.type` trả về, và map 3 field mới sang shape UI.

## 5. Form soạn bài (`question-modal.tsx`)

Thêm ô chọn loại ở đầu form. Toggle "1 đáp án đúng / Nhiều đáp án đúng" ở footer
**gộp vào ô chọn loại** — hai dạng trắc nghiệm thành hai mục trong dropdown, footer chỉ
còn nút Huỷ/Lưu.

Phần dùng chung mọi loại: điểm số, ô đề bài.

### 5.1. Điền từ — ô đề bài dùng `<textarea>` thay TiptapEditor

Nút **"Chèn chỗ trống"** cần biết vị trí con trỏ để chèn `{{n}}` đúng chỗ.
`TiptapEditor` không expose editor instance nên không làm được; sửa component dùng
chung đó thì ảnh hưởng cả màn bài đọc và bài học. Câu điền từ vốn là **một câu văn**,
không phải tài liệu có định dạng, nên dùng `<textarea>` thường:
- `selectionStart` cho vị trí con trỏ chính xác
- giá trị vẫn là chuỗi, vẫn hợp lệ markdown → không phá round-trip ở §2

Hành vi:
- Bấm "Chèn chỗ trống" → chèn `{{n}}` tại con trỏ với `n` là số nhỏ nhất chưa dùng, và
  thêm một dòng nhập đáp án tương ứng
- Xoá marker khỏi đề → dòng đáp án tương ứng tự biến mất (đồng bộ theo marker có thật
  trong đề, không giữ dòng mồ côi)
- Mỗi chỗ trống nhập được **nhiều đáp án chấp nhận được**

**Ràng buộc backend phải khớp** (`assertQuestionBank`): tập số trong marker phải bằng
đúng tập `blanks[].index`; không được trùng số ở cả hai phía; mỗi blank cần ≥1 đáp án
không rỗng. FE chặn trước bằng validate cục bộ để staff không phải đoán lỗi từ 400.

### 5.2. Nối cặp — bảng 2 cột

Danh sách dòng, mỗi dòng gồm ô vế trái và ô vế phải, có nút xoá dòng và nút thêm dòng.
Tối thiểu 2 cặp; hai vế đều không được rỗng.

### 5.3. Sắp xếp block — danh sách + nút ↑↓

Staff nhập các block **theo đúng thứ tự đáp án**. Mỗi dòng có nút lên/xuống để đổi chỗ,
nút xoá; có nút thêm block. Tối thiểu 2 block, nội dung không rỗng.

Dùng nút thay kéo-thả vì: repo không có thư viện DnD, thao tác này hiếm, và nút dùng
được bằng bàn phím. Kéo-thả chỉ thật sự cần ở phía học viên (P3).

## 6. Màn chi tiết bộ đề (`exam-set-detail-view.tsx`)

Hiện render `q.options` vô điều kiện. Rẽ nhánh theo `q.type`:
- **Điền từ:** hiện đề với marker được tô nổi bật, kèm danh sách đáp án chấp nhận theo
  từng chỗ trống
- **Nối cặp:** bảng cặp trái → phải
- **Sắp xếp:** chuỗi block đánh số theo thứ tự đúng
- **Trắc nghiệm:** giữ nguyên radio/checkbox như hiện tại

## 7. Import Excel

Backend đã đổi sang bố cục 16 cột và template mẫu có ví dụ đủ 6 loại. FE cần:
- `mapImportedQuestionsToUiQuestions` (`src/utils/quiz.utils.ts`) mang theo `type` và 3
  field mới thay vì chỉ `options`
- Preview trong `create-quiz-modal.tsx` hiển thị đúng 3 dạng mới thay vì ô rỗng
- `getQuestionTypeLabel` bổ sung nhãn tiếng Việt cho 3 loại mới

Không cần đổi service hay endpoint — `importQuizExcel`/`downloadQuizExcelTemplate` chỉ
truyền file.

## 8. Quy ước bắt buộc của repo

- **Mọi chuỗi tiếng Việt** phải nằm trong `UI_TEXT` (`src/constants/ui-text.constants.ts`),
  nhóm `examsSetsEl`. ESLint chặn hardcode.
- **Không khai `interface`/`type` inline** trong `src/components` và `src/views` — đưa ra
  `src/types/*.ts`.
- Không hex literal thô, không magic number, không hằng UPPER_CASE trong components.
- Verify: `npm run type-check` + `npm run lint:check` (0 warning) + `npm run build`.
  Repo **không có unit test** cho màn CRUD.

## 9. Rủi ro

**Đổi UX quen thuộc của dạng trắc nghiệm.** Toggle ở footer biến mất, thay bằng dropdown
ở đầu form. Người dùng cũ sẽ thấy khác. Đã chốt với người dùng là chấp nhận, đổi lấy
một chỗ soạn cho mọi loại.

**Round-trip `explanation`/`text`.** Mọi thay đổi ở mapper phải giữ nguyên quan hệ mô tả
ở §2, nếu không dữ liệu quiz cũ sẽ mất nội dung câu hỏi.

**Bố cục 4 đáp án cứng.** Modal hiện luôn ép đúng 4 option A/B/C/D và đặt `required` trên
cả 4 textarea. Khi chuyển sang dạng mới, các ô đó phải không còn `required`, nếu không
form không submit được.
