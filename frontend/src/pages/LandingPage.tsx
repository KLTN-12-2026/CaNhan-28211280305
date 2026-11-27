import {
  ArrowDown,
  ArrowRight,
  Check,
  MessageCircle,
  PanelsTopLeft,
  Sparkles,
  UsersRound,
  Video,
} from "lucide-react";
import { Link, Navigate } from "react-router";
import { useAuthStore } from "@/stores/useAuthStore";

const features = [
  {
    icon: MessageCircle,
    title: "Trò chuyện không gián đoạn",
    description:
      "Nhắn tin cá nhân hoặc theo nhóm, gửi ảnh và trả lời tin nhắn trong cùng một không gian.",
    color: "bg-violet-100 text-violet-700",
  },
  {
    icon: Video,
    title: "Gọi audio & video",
    description:
      "Kết nối trực tiếp với bạn bè, bật camera hoặc chia sẻ màn hình ngay trong cuộc gọi.",
    color: "bg-sky-100 text-sky-700",
  },
  {
    icon: UsersRound,
    title: "Cùng nhau tạo nên ý tưởng",
    description:
      "Cùng ghi chú ý tưởng và phác thảo trên Whiteboard được chia sẻ với cả nhóm.",
    color: "bg-fuchsia-100 text-fuchsia-700",
  },
  {
    icon: PanelsTopLeft,
    title: "Kết nối trong một không gian",
    description:
      "Quản lý bạn bè, nhóm chat và các cuộc gọi trong giao diện dễ sử dụng.",
    color: "bg-amber-100 text-amber-700",
  },
];

const LandingPage = () => {
  const { accessToken } = useAuthStore();

  if (accessToken) {
    return <Navigate to="/chat" replace />;
  }

  return (
    <main className="min-h-screen overflow-hidden bg-white text-slate-900">
      <header className="relative z-10 border-b border-violet-100/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link
            to="/"
            className="flex items-center gap-3"
            aria-label="WebConnect RT"
          >
            <img src="/logo.svg" alt="" className="h-10 w-auto" />
            <span className="text-xl font-extrabold tracking-tight text-slate-900">
              WebConnect <span className="text-violet-700">RT</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a className="transition hover:text-violet-700" href="#tinh-nang">
              Tính năng
            </a>
            <a className="transition hover:text-violet-700" href="#gioi-thieu">
              Giới thiệu
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/signin"
              className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-violet-50 hover:text-violet-700 sm:px-4"
            >
              Đăng nhập
            </Link>
            <Link
              to="/signup"
              className="rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-700/20 transition hover:bg-violet-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700"
            >
              Đăng ký
            </Link>
          </div>
        </div>
      </header>

      <section id="gioi-thieu" className="relative isolate">
        <div className="pointer-events-none absolute -right-36 -top-20 -z-10 size-[34rem] rounded-full bg-fuchsia-200/50 blur-3xl" />
        <div className="pointer-events-none absolute -left-48 top-56 -z-10 size-[32rem] rounded-full bg-violet-200/50 blur-3xl" />

        <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1fr_1.05fr] lg:gap-16 lg:py-28">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/80 px-4 py-2 text-sm font-semibold text-violet-800 shadow-sm">
              <Sparkles className="size-4" />
              Kết nối và cộng tác dễ dàng hơn
            </div>

            <h1 className="text-4xl font-black leading-[1.12] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Gần nhau hơn,
              <span className="mt-2 block bg-gradient-to-r from-violet-700 via-fuchsia-600 to-pink-500 bg-clip-text text-transparent">
                dù ở bất cứ đâu.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              Trò chuyện, gọi video và cùng làm việc với bạn bè trong một không
              gian trực tuyến thân thiện. Bắt đầu kết nối chỉ với vài thao tác.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-700 px-6 py-3.5 font-bold text-white shadow-xl shadow-violet-700/25 transition hover:-translate-y-0.5 hover:bg-violet-800"
              >
                Tạo tài khoản miễn phí
                <ArrowRight className="size-5" />
              </Link>
              <Link
                to="/signin"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white/80 px-6 py-3.5 font-bold text-slate-700 transition hover:border-violet-200 hover:bg-violet-50"
              >
                Tôi đã có tài khoản
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-600">
              <span className="inline-flex items-center gap-2">
                <Check className="size-4 text-emerald-600" />
                Trò chuyện realtime
              </span>
              <span className="inline-flex items-center gap-2">
                <Check className="size-4 text-emerald-600" />
                Kết nối an toàn
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -inset-5 rounded-[2.5rem] bg-gradient-to-br from-violet-300/50 via-fuchsia-200/50 to-sky-200/60 blur-2xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white bg-white/90 p-3 shadow-2xl shadow-violet-900/15 sm:p-5">
              <div className="overflow-hidden rounded-[1.5rem] bg-slate-50">
                <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white">
                      <UsersRound className="size-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Nhóm dự án</p>
                      <p className="text-xs text-slate-500">4 thành viên</p>
                    </div>
                  </div>
                  <div className="flex -space-x-2">
                    {["bg-violet-400", "bg-sky-400", "bg-pink-400"].map(
                      (color, index) => (
                        <div
                          key={color}
                          className={`flex size-8 items-center justify-center rounded-full border-2 border-white ${color} text-xs font-bold text-white`}
                          aria-label={`Thành viên ${index + 1}`}
                        >
                          {["A", "M", "L"][index]}
                        </div>
                      ),
                    )}
                  </div>
                </div>

                <div className="space-y-5 px-4 py-6 sm:px-6 sm:py-8">
                  <div className="flex items-end gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">
                      M
                    </div>
                    <div className="max-w-[78%] rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm">
                      <p className="text-xs font-bold text-sky-700">Minh Anh</p>
                      <p className="mt-1 text-sm leading-6 text-slate-700">
                        Mọi người xem bản phác thảo mới nhé! Mình đã cập nhật
                        các ý tưởng cho buổi họp.
                      </p>
                    </div>
                  </div>

                  <div className="ml-auto max-w-[82%] rounded-2xl rounded-br-md bg-gradient-to-br from-violet-700 to-fuchsia-600 px-4 py-3 text-white shadow-lg shadow-violet-700/15">
                    <p className="text-sm leading-6">
                      Tuyệt vời! Mình sẽ mở Whiteboard để cả nhóm cùng góp ý.
                    </p>
                    <p className="mt-2 text-right text-[11px] text-violet-100">
                      Đã xem · 10:42
                    </p>
                  </div>

                  <div className="flex items-center gap-2 rounded-2xl border border-violet-100 bg-white px-4 py-3 shadow-sm">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-fuchsia-100 text-fuchsia-700">
                      <PanelsTopLeft className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-800">
                        Whiteboard nhóm
                      </p>
                      <p className="text-xs text-slate-500">
                        Cùng nhau lên ý tưởng
                      </p>
                    </div>
                    <ArrowRight className="size-4 text-violet-600" />
                  </div>

                  <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs text-slate-500 shadow-sm">
                    <span className="flex gap-1" aria-hidden="true">
                      <span className="size-1.5 animate-bounce rounded-full bg-violet-500 [animation-delay:-0.2s]" />
                      <span className="size-1.5 animate-bounce rounded-full bg-violet-500 [animation-delay:-0.1s]" />
                      <span className="size-1.5 animate-bounce rounded-full bg-violet-500" />
                    </span>
                    Minh Anh đang nhập...
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -right-3 bottom-10 hidden items-center gap-3 rounded-2xl border border-white bg-white px-4 py-3 shadow-xl sm:flex">
              <div className="flex size-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                <Video className="size-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Gọi video</p>
                <p className="text-xs text-slate-500">Chỉ một chạm</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="tinh-nang"
        className="bg-slate-50/80 px-5 py-20 sm:px-8 sm:py-24"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-violet-700">
              Kết nối theo cách của bạn
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Kết nối dễ dàng, làm việc hiệu quả
            </h2>
            <p className="mt-4 leading-7 text-slate-600">
              Từ một lời nhắn nhanh đến buổi làm việc cùng nhau, WebConnect RT
              giúp mọi người giữ liên lạc và chia sẻ ý tưởng.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, description, color }) => (
              <article
                key={title}
                className="group rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-violet-200 hover:shadow-xl hover:shadow-violet-900/5"
              >
                <div
                  className={`flex size-12 items-center justify-center rounded-2xl ${color}`}
                >
                  <Icon className="size-6" />
                </div>
                <h3 className="mt-5 text-lg font-bold text-slate-900">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 sm:py-24">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-violet-800 via-violet-700 to-fuchsia-600 px-6 py-12 text-center text-white shadow-2xl shadow-violet-900/20 sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute -right-16 -top-28 size-80 rounded-full border-[40px] border-white/10" />
          <div className="pointer-events-none absolute -bottom-48 -left-16 size-96 rounded-full border-[50px] border-white/10" />
          <div className="relative mx-auto max-w-2xl">
            <p className="text-sm font-semibold text-violet-100">
              Sẵn sàng kết nối?
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
              Bắt đầu câu chuyện của bạn ngay hôm nay
            </h2>
            <p className="mt-4 leading-7 text-violet-100">
              Tạo tài khoản để kết nối, trò chuyện và chia sẻ những ý tưởng cùng
              mọi người.
            </p>
            <Link
              to="/signup"
              className="mt-8 inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 font-bold text-violet-800 shadow-lg transition hover:-translate-y-0.5 hover:bg-violet-50"
            >
              Đăng ký miễn phí
              <ArrowRight className="size-5" />
            </Link>
            <a
              href="#gioi-thieu"
              className="mx-auto mt-8 flex w-fit items-center gap-2 text-sm font-medium text-violet-100 transition hover:text-white"
            >
              Về đầu trang
              <ArrowDown className="size-4 rotate-180" />
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-5 py-7 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-slate-500 sm:flex-row">
          <Link
            to="/"
            className="flex items-center gap-2 font-bold text-slate-700"
          >
            <img src="/logo.svg" alt="" className="h-7 w-auto" />
            WebConnect RT
          </Link>
          <p>Trò chuyện và cộng tác, đơn giản hơn mỗi ngày.</p>
          <div className="flex items-center gap-4">
            <Link className="transition hover:text-violet-700" to="/signin">
              Đăng nhập
            </Link>
            <Link className="transition hover:text-violet-700" to="/signup">
              Đăng ký
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
};

export default LandingPage;
