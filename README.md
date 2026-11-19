# Lọc Máu Qua Lũ

Bản demo mô phỏng việc điều phối các buổi lọc máu định kỳ khi cơ sở quen thuộc tạm dừng do mưa lũ. Mở `dist/index.html` bằng trình duyệt để chạy trực tiếp. Bản demo dùng HTML, CSS và JavaScript thuần.

## Trải nghiệm

1. Chọn một trong ba tình huống. Các buổi bị ảnh hưởng chuyển sang trạng thái **Cần xếp lại**.
2. Theo dòng điều trị của từng người, mở một buổi và chọn chỗ lọc cùng chuyến đi. Bản demo kiểm tra chỗ trống, khu vực đón, điểm đến và giờ đến.
3. Chọn **Gợi ý xếp bù** để xem phương án cho nhiều buổi cùng lúc. Mô phỏng giữ các phương án đang khả thi và tìm cách xếp nhiều buổi còn lại nhất theo nguồn lực của từng ngày. Người dùng xem rồi xác nhận áp dụng.
4. Bật **So sánh trước–sau** để xem những buổi có thay đổi so với đầu cùng kịch bản. Phiếu bàn giao chứa lịch hiện tại và tải được dưới dạng văn bản.

Nhân vật, cơ sở, phương tiện, năng lực tiếp nhận và lịch đều là dữ liệu hư cấu. Trạng thái được giữ trong phiên hiện tại và trở về mặc định khi tải lại trang. Việc tiếp nhận và lịch điều trị thực tế do nhân viên y tế quyết định.

## Ảnh minh họa

`dist/flood-valley.jpg` được tạo bằng ImageGen và nén lại để tải nhanh. Prompt tạo ảnh:

> Use case: photorealistic-natural. Asset type: a wide editorial hero background for a Vietnamese public-health flood planning simulation. Cinematic drone photograph of an overflowing muddy river under low rain clouds in a rural central Vietnamese valley, with a small cluster of red-roofed homes on the right at the foot of forested hills and a modest concrete bridge only in the distant right half. The river on the left can sit behind large white website text, mostly dark atmospheric negative space. The landscape should read even at a 3:1 crop. Deep midnight petrol and pine green, slate-blue clouds, muted silver water and restrained warm red roof accents. Atmospheric and sober, realistic soft monsoon light, premium documentary editorial photography. All fictional geography, no identifiable people, no words, no watermark, no graphics, no collage. Wide landscape.
