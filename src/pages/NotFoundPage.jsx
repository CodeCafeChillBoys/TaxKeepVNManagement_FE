import { Link } from 'react-router-dom'
import { FileQuestion, Home, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF8F0] p-4 text-center">
      <div className="max-w-md w-full p-8 rounded-2xl bg-white shadow-xl border border-cream-300/80 flex flex-col items-center">
        <div className="w-20 h-20 rounded-full bg-brand-50 border-2 border-brand-200 flex items-center justify-center text-brand-700 mb-6">
          <FileQuestion className="w-10 h-10 text-brand-700" />
        </div>

        <h1 className="text-4xl font-black text-stone-900 tracking-tight mb-2">404</h1>
        <h2 className="text-lg font-bold text-stone-800 uppercase tracking-wide mb-3">
          Không tìm thấy trang yêu cầu
        </h2>
        <p className="text-xs text-stone-600 leading-relaxed mb-6">
          Đường dẫn bạn vừa truy cập không tồn tại hoặc đã được thay đổi trong hệ thống Quản lý Thuế Thu nhập Cá nhân TAX KEEP VN.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            className="flex-1 text-xs h-10 border-stone-300 hover:bg-stone-50"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Quay lại
          </Button>

          <Link to="/admin" className="flex-1">
            <Button className="w-full text-xs h-10">
              <Home className="w-4 h-4 mr-1.5" />
              Trang quản trị
            </Button>
          </Link>
        </div>
      </div>

      <footer className="mt-8 text-[11px] text-stone-500">
        TAX KEEP VN © {new Date().getFullYear()} — Hệ thống Quản lý Thuế Thu nhập Cá nhân
      </footer>
    </div>
  )
}
