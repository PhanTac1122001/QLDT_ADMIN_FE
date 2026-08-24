# Sửa nút tải file mẫu import bộ đề Quizzi

Ngày: 2026-08-24
Phạm vi: `QLDT_ADMIN_FE` (chỉ frontend, backend không đổi)

## Vấn đề

Người dùng báo phần upload bộ đề Quizzi không có file mẫu import để tải về.

Thực tế file mẫu **có đủ ở cả hai đầu**:

- Backend `GET /v1/staff/session-quizzes/excel-template`
  (`session-quiz.service.ts:225 generateExcelTemplate`) sinh workbook 14 cột —
  `question_content`, `type`, `points`, `category`, `difficulty`, `answer_1..4`,
  `isCorrect`, `explanation_1..4` — kèm header tô màu và 2 dòng ví dụ.
- Frontend đã render nút "Tải file mẫu" trong `create-quizzi-set-modal.tsx`,
  ngay cạnh nút Import.

Nút đó chưa bao giờ chạy được. `session-quiz.service.ts:86`:

```ts
const token = typeof window !== "undefined"
    ? localStorage.getItem("accessToken") || localStorage.getItem("token")
    : null
```

Token của app nằm trong **cookie** `access_token`
(`APP_CONFIG.ACCESS_TOKEN_KEY`, do `http-client.ts` đọc/ghi qua `js-cookie`).
Không chỗ nào trong repo ghi token vào `localStorage`. Vì vậy `token` luôn
`null`, request đi không có header `Authorization`, `StaffAuthServiceGuard` từ
chối, `!response.ok` → throw → toast "Không thể tải file mẫu Excel".

`downloadExcelTemplate` là hàm **duy nhất** trong repo tự viết `fetch` thay vì
dùng `httpClient`. Hai hàm cùng chức năng đều làm đúng và chạy được:

| Hàm | Cách gọi | Chạy được |
|---|---|---|
| `downloadQuizExcelTemplate` — `quiz.service.ts:51` | `httpClient(..., parseAs:"blob")` | có |
| `downloadFlashcardTemplate` — `flashcard.service.ts:95` | `httpClient(..., parseAs:"blob")` | có |
| `downloadExcelTemplate` — `session-quiz.service.ts:85` | `fetch` + localStorage | **không** |

## Giải pháp

Sửa hàm hỏng, đồng thời gom phần lặp của cả ba.

### 1. Helper dùng chung

Tạo `src/utils/download.utils.ts`:

```ts
export async function downloadFileFromApi(endpoint: string, fileName: string): Promise<void>
```

Nội dung: gọi `httpClient<Blob>(endpoint, { method: GET, parseAs: "blob" })`, tạo
object URL, kích hoạt thẻ `<a download>`, rồi `revokeObjectURL`.

Dùng `httpClient` chứ không phải `fetch` là điểm mấu chốt — nó tự gắn Bearer từ
cookie, tự refresh khi 401, và ném `HttpError` mang message thật từ backend thay
vì chuỗi cứng.

### 2. Ba service gọi helper

- `session-quiz.service.ts` — `downloadExcelTemplate()` (đang hỏng)
- `quiz.service.ts` — `downloadQuizExcelTemplate()`
- `flashcard.service.ts` — `downloadFlashcardTemplate()`

Giữ nguyên tên hàm export và chữ ký `(): Promise<void>` để không caller nào phải
đổi.

### 3. Tên file vào constant

`session_quiz_import_template.xlsx` và `flashcard_import_template.xlsx` đang
hardcode. Đưa vào constants cho khớp `QUIZ_TEMPLATE_FILENAME`
(`src/constants/quiz.constants.ts:6`).

## Vì sao gom chung, không chỉ vá một dòng

Ba bản sao ~12 dòng gần y hệt nhau là đúng ngưỡng nên tách; repo có sẵn script
`duplication-check` (jscpd) nên đây là loại lặp team đã quan tâm. Quan trọng hơn:
bản sao thứ tư rất dễ lại tự chế `fetch` và tái lặp đúng lỗi token này. Có helper
thì đường dễ đi nhất cũng là đường đúng.

## Ngoài phạm vi

- `excel-import-modal.tsx` (import **sinh viên**, dùng ở `users-view.tsx`) không
  có nút tải file mẫu, và backend cũng chưa có endpoint template tương ứng. Đây
  là tính năng thiếu thật, khác với Quizzi — làm riêng.
- Không đụng backend. Endpoint template đã chạy đúng.
- Không đổi nội dung/cấu trúc file Excel mẫu.

## Kiểm chứng

Repo không có test framework (`package.json` không có jest/vitest).

- `npm run type-check`
- `npx eslint --max-warnings=0` trên đúng các file đã sửa (không lint toàn repo)
- Thủ công: mở modal tạo bộ đề Quizzi → bấm "Tải file mẫu" → file `.xlsx` phải
  tải về và mở được, đủ 14 cột đúng thứ tự trên. Kiểm tra network request trả
  200 kèm `Content-Type` của xlsx, không phải 401.
- Hồi quy: bấm nút tải mẫu ở bộ đề (exam sets) và ở flashcard, cả hai phải vẫn
  chạy như trước.
