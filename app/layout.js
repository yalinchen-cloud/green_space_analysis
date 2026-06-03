// app/layout.js
import './globals.css'; // 确保存在全局样式文件，如果还没有可以创建空文件或使用 Tailwind

export const metadata = {
  title: '城市绿地分析系统',
  description: '成都郫都区绿地时空变化监测',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body className="bg-gray-50">{children}</body>
    </html>
  );
}