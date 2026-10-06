# PDF Editor — Gộp PDF

Web app [Next.js](https://nextjs.org) gộp nhiều file PDF thành một file, chạy **hoàn toàn trên trình duyệt**. Phù hợp gộp hóa đơn/bill (ví dụ 5 bill → 1 PDF 5 trang theo thứ tự bạn chọn).

Repository: [github.com/shannon1102/pdf-editor](https://github.com/shannon1102/pdf-editor)

## Tính năng

- Chọn hoặc kéo thả nhiều file PDF
- Sắp xếp thứ tự trước khi gộp
- Gộp và tải về một file PDF
- Sau khi tải, danh sách file trên trang được xóa (không giữ bản gộp trong bộ nhớ UI)
- **Không upload** PDF lên server — xử lý local, phù hợp deploy Vercel (chỉ host static/SSR shell)

## Thư viện

- **[pdf-lib](https://pdf-lib.js.org/)** — pure JavaScript, `copyPages` để nối trang mà không re-render nội dung trang
- Dynamic import khi bấm gộp để giảm bundle ban đầu

### Giới hạn cần biết

- Gộp theo **trang**; bookmark/outline hoặc form field cấp tài liệu có thể không được giữ ([chi tiết](https://dev.to/hexloomlabs/merge-pdfs-in-the-browser-with-pdf-lib-and-what-it-silently-drops-2kp3))
- PDF có mật khẩu / mã hóa có thể không mở được
- Khuyến nghị ≤ 20 file, tổng ~100MB để tránh hết RAM trên trình duyệt

## Chạy local

```bash
npm install
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000).

```bash
npm run build
npm start
```

## Deploy Vercel

1. Import repo GitHub `shannon1102/pdf-editor` trên [Vercel](https://vercel.com/new)
2. Framework: Next.js (mặc định)
3. Không cần biến môi trường cho bản client-only

Production URL sẽ được cập nhật sau khi deploy (xem mục dưới nếu đã có).

## Kiểm thử nhanh

1. Thêm ≥ 2 file PDF
2. Đổi thứ tự bằng ↑ ↓
3. Bấm **Gộp và tải về**
4. Mở DevTools → Network: không có request mang nội dung PDF
5. Bấm **Làm mới** nếu muốn gộp lô khác
