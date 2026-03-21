import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores';

export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/register');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* 导航栏 */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-[var(--color-border)]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-[#832FFF] to-[#4c53ff] rounded-xl flex items-center justify-center">
              <span className="text-white text-lg">📝</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-[#832FFF] to-[#4c53ff] bg-clip-text text-transparent">
              DayLog
            </span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#features" className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
              功能
            </a>
            <a href="#pricing" className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
              价格
            </a>
            <Link to="/login" className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
              登录
            </Link>
            <button
              onClick={handleGetStarted}
              className="px-4 py-2 bg-gradient-to-r from-[#832FFF] to-[#4c53ff] text-white text-sm font-medium rounded-xl hover:shadow-lg hover:shadow-purple-500/25 transition-all"
            >
              开始使用
            </button>
          </div>
        </div>
      </nav>

      {/* Hero 区域 */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* 渐变背景装饰 */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-purple-100/50 via-blue-100/30 to-transparent rounded-full blur-3xl -z-10"></div>
          
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-50 to-blue-50 rounded-full mb-8">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-sm text-[var(--color-text-secondary)]">全新版本已发布</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-[#832FFF] via-[#6366f1] to-[#4c53ff] bg-clip-text text-transparent">
              新一代协作笔记平台
            </span>
          </h1>
          
          <p className="text-xl text-[var(--color-text-secondary)] mb-10 max-w-2xl mx-auto">
            DayLog 让团队协作更简单、更高效。支持画板、表格、地图嵌入等丰富功能，
            像 Notion 一样强大，像 BoardMix 一样灵活。
          </p>
          
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handleGetStarted}
              className="px-8 py-4 bg-gradient-to-r from-[#832FFF] to-[#4c53ff] text-white font-semibold rounded-2xl hover:shadow-xl hover:shadow-purple-500/30 hover:-translate-y-1 transition-all"
            >
              免费开始
            </button>
            <a
              href="#features"
              className="px-8 py-4 border border-[var(--color-border)] text-[var(--color-text-primary)] font-semibold rounded-2xl hover:bg-[var(--color-bg-hover)] transition-all"
            >
              了解更多
            </a>
          </div>

          {/* 产品截图预览 */}
          <div className="mt-16 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-10"></div>
            <div className="bg-gradient-to-br from-[#832FFF]/10 to-[#4c53ff]/10 rounded-3xl p-4 shadow-2xl">
              <div className="bg-white rounded-2xl shadow-inner overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <div className="p-6 min-h-[300px] bg-gradient-to-br from-gray-50 to-white">
                  <div className="flex gap-4">
                    {/* 侧边栏预览 */}
                    <div className="w-48 bg-gray-100 rounded-xl p-4 hidden md:block">
                      <div className="w-full h-6 bg-purple-200 rounded mb-3"></div>
                      <div className="w-3/4 h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="w-full h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="w-2/3 h-4 bg-gray-200 rounded"></div>
                    </div>
                    {/* 内容预览 */}
                    <div className="flex-1">
                      <div className="w-2/3 h-8 bg-gradient-to-r from-purple-300 to-blue-300 rounded mb-4"></div>
                      <div className="w-full h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="w-5/6 h-4 bg-gray-200 rounded mb-4"></div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="h-24 bg-purple-100 rounded-xl"></div>
                        <div className="h-24 bg-blue-100 rounded-xl"></div>
                        <div className="h-24 bg-pink-100 rounded-xl"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 功能展示 */}
      <section id="features" className="py-20 px-6 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-[#832FFF] to-[#4c53ff] bg-clip-text text-transparent">
                强大功能，无限可能
              </span>
            </h2>
            <p className="text-lg text-[var(--color-text-secondary)]">
              从笔记到协作，从个人到团队，DayLog 满足你的一切需求
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 功能卡片 */}
            {[
              {
                icon: '🎨',
                title: '画板功能',
                desc: '支持 Excalidraw 画板，自由绘制、形状、文本，让创意无限发挥',
                color: 'from-purple-500 to-pink-500',
              },
              {
                icon: '📊',
                title: '数据表格',
                desc: '类似 Notion 的可编辑表格，支持行列增删，数据展示清晰直观',
                color: 'from-blue-500 to-cyan-500',
              },
              {
                icon: '🗺️',
                title: '地图嵌入',
                desc: '支持高德、百度、Google Maps，轻松嵌入地理位置信息',
                color: 'from-green-500 to-emerald-500',
              },
              {
                icon: '🔗',
                title: '网站嵌入',
                desc: '嵌入 YouTube、GitHub、任意网页，丰富内容形式',
                color: 'from-orange-500 to-red-500',
              },
              {
                icon: '👥',
                title: '团队协作',
                desc: '工作空间、成员管理、权限控制，团队协作更高效',
                color: 'from-indigo-500 to-purple-500',
              },
              {
                icon: '📤',
                title: 'Markdown',
                desc: '支持 Markdown 导入导出，轻松迁移和备份你的内容',
                color: 'from-gray-500 to-slate-500',
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="group p-6 bg-white rounded-2xl border border-[var(--color-border)] hover:border-transparent hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform`}>
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 价格区域 */}
      <section id="pricing" className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-[#832FFF] to-[#4c53ff] bg-clip-text text-transparent">
                简单透明的价格
              </span>
            </h2>
            <p className="text-lg text-[var(--color-text-secondary)]">
              永久免费，无隐藏费用
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* 免费版 */}
            <div className="p-8 bg-white rounded-3xl border border-[var(--color-border)]">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">免费版</h3>
                <p className="text-sm text-[var(--color-text-secondary)]">适合个人使用</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold">¥0</span>
                <span className="text-[var(--color-text-secondary)]">/月</span>
              </div>
              <ul className="space-y-3 mb-8">
                {['无限页面', '基础块类型', '5MB 文件上传', '公开分享'].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={handleGetStarted}
                className="w-full py-3 border border-[var(--color-border)] text-[var(--color-text-primary)] font-medium rounded-xl hover:bg-[var(--color-bg-hover)] transition-all"
              >
                免费开始
              </button>
            </div>

            {/* 专业版 */}
            <div className="relative p-8 bg-gradient-to-br from-[#832FFF] to-[#4c53ff] rounded-3xl text-white overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="relative">
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-bold">专业版</h3>
                    <span className="px-2 py-0.5 bg-white/20 text-xs rounded-full">推荐</span>
                  </div>
                  <p className="text-white/80 text-sm">适合团队协作</p>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-bold">¥29</span>
                  <span className="text-white/80">/月</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {['所有免费功能', '画板 & 表格', '100MB 文件上传', '团队协作', '优先支持'].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={handleGetStarted}
                  className="w-full py-3 bg-white text-[#832FFF] font-medium rounded-xl hover:shadow-lg transition-all"
                >
                  立即升级
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA 区域 */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="p-12 bg-gradient-to-br from-[#832FFF]/10 to-[#4c53ff]/10 rounded-3xl">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              准备好开始了吗？
            </h2>
            <p className="text-lg text-[var(--color-text-secondary)] mb-8">
              加入数千用户的行列，体验全新的协作笔记方式
            </p>
            <button
              onClick={handleGetStarted}
              className="px-10 py-4 bg-gradient-to-r from-[#832FFF] to-[#4c53ff] text-white font-semibold rounded-2xl hover:shadow-xl hover:shadow-purple-500/30 hover:-translate-y-1 transition-all"
            >
              免费注册
            </button>
          </div>
        </div>
      </section>

      {/* 页脚 */}
      <footer className="py-12 px-6 border-t border-[var(--color-border)]">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-[#832FFF] to-[#4c53ff] rounded-xl flex items-center justify-center">
                <span className="text-white text-sm">📝</span>
              </div>
              <span className="font-bold bg-gradient-to-r from-[#832FFF] to-[#4c53ff] bg-clip-text text-transparent">
                DayLog
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-[var(--color-text-secondary)]">
              <a href="#" className="hover:text-[var(--color-text-primary)] transition-colors">关于我们</a>
              <a href="#" className="hover:text-[var(--color-text-primary)] transition-colors">隐私政策</a>
              <a href="#" className="hover:text-[var(--color-text-primary)] transition-colors">使用条款</a>
              <a href="#" className="hover:text-[var(--color-text-primary)] transition-colors">联系我们</a>
            </div>
            <p className="text-sm text-[var(--color-text-muted)]">
              © 2024 DayLog. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
