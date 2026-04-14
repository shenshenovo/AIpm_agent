import Link from "next/link";
import { TopNav } from "@/components/top-nav";

const features = [
  {
    title: "JD拆解&岗位输入",
    description: "看懂岗位到底要求什么，明确需求目标"
  },
  {
    title: "能力差距分析&能力判断",
    description: "知道自己还缺什么，准确定位差距"
  },
  {
    title: "学习计划&行动输出",
    description: "生成可执行的参考方案，制定详细计划"
  },
  {
    title: "模拟面试&训练反馈",
    description: "练题、点评、查漏补缺、获得实时反馈"
  }
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <TopNav />
      <main className="pt-[72px]">
        <section className="flex min-h-[calc(100vh-72px)] border-b border-line bg-panel">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-center px-6 py-24 text-center lg:px-10 lg:py-32">
            <p className="text-lg uppercase tracking-[0.18em] text-muted">
              AI PM JOB SEARCH AGENT
            </p>
            <h1 className="mt-10 max-w-4xl text-5xl font-semibold leading-tight text-ink md:text-6xl">
              面向AI产品经理求职的
              <br />
              结构化陪练工作台
            </h1>
            <div className="mt-14 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/capability-profile"
                className="rounded-xl bg-ink px-8 py-4 text-base font-medium text-white transition hover:bg-black"
              >
                开始使用
              </Link>
              <a
                href="#core-features"
                className="rounded-xl border border-line bg-white px-8 py-4 text-base font-medium text-ink transition hover:border-ink"
              >
                查看功能
              </a>
            </div>
          </div>
        </section>

        <section id="core-features" className="mx-auto max-w-6xl px-6 py-20 lg:px-10 lg:py-24">
          <div className="text-center">
            <h2 className="text-4xl font-semibold text-ink">核心能力与求职闭环</h2>
          </div>

          <div className="mt-16 grid md:grid-cols-2">
            {features.map((feature, index) => (
              <article
                key={feature.title}
                className={`flex min-h-[240px] items-start gap-6 bg-white px-8 py-10 lg:px-10 ${
                  index % 2 === 0 ? "md:border-r md:border-line" : ""
                } ${index < 2 ? "border-b border-line" : ""}`}
              >
                <div className="mt-1 h-16 w-16 flex-none rounded-full bg-[#bdbdbd]" />
                <div>
                  <h3 className="text-2xl font-semibold leading-snug text-ink">
                    {feature.title}
                  </h3>
                  <p className="mt-5 text-lg leading-8 text-muted">{feature.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="border-t border-line">
          <div className="mx-auto flex max-w-4xl flex-col items-center px-6 py-20 text-center lg:px-10 lg:py-24">
            <Link
              href="/capability-profile"
              className="rounded-xl bg-ink px-10 py-4 text-xl font-semibold text-white transition hover:bg-black"
            >
              立即开始准备
            </Link>
            <p className="mt-8 text-lg leading-8 text-muted">
              从一份 JD 开始，快速进入岗位分析、差距定位、学习规划和模拟面试的完整准备流程
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
