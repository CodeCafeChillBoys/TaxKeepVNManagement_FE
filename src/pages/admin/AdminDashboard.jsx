import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AdminLayout } from '@/layouts/AdminLayout'
import { TaxDocumentUploadPage } from './TaxDocumentUploadPage'
import { TaxRuleReviewPage } from './TaxRuleReviewPage'
import { AdminProfileSettings } from './AdminProfileSettings'
import { AdminDependentRulesPage } from './AdminDependentRulesPage'
import { useAuth } from '@/hooks/useAuth'

export function AdminDashboard({ onLogout }) {
  const { section = 'boc-tach-van-ban-ai' } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [extractedData, setExtractedData] = useState(() => {
    try {
      const saved = sessionStorage.getItem('taxkeep_extracted_data')
      const approvedList = JSON.parse(localStorage.getItem('taxkeepvn_approved_rulesets') || '[]')

      if (saved) {
        const parsed = JSON.parse(saved)
        const ruleId = parsed.taxRuleSet?.ruleSetId || parsed.ruleSetId || parsed.id
        const year = parsed.taxRuleSet?.taxYear || parsed.taxYear
        if ((ruleId && approvedList.includes(ruleId)) || (year && approvedList.includes(String(year)))) {
          parsed.status = 'Active'
          if (parsed.taxRuleSet) parsed.taxRuleSet.status = 'Active'
        }
        return parsed
      }

      // Fallback từ localStorage nếu sessionStorage trống
      const docs = JSON.parse(localStorage.getItem('taxkeepvn_uploaded_documents') || '[]')
      if (docs.length > 0 && docs[0].extractedData) {
        const docData = { ...docs[0].extractedData }
        const ruleId = docData.taxRuleSet?.ruleSetId || docData.ruleSetId || docs[0].id
        const year = docData.taxRuleSet?.taxYear || docs[0].taxYear
        if ((ruleId && approvedList.includes(ruleId)) || (year && approvedList.includes(String(year)))) {
          docData.status = 'Active'
          if (docData.taxRuleSet) docData.taxRuleSet = { ...docData.taxRuleSet, status: 'Active' }
        }
        return docData
      }
      return null
    } catch {
      return null
    }
  })

  // Danh sách tài liệu đã upload gần đây từ localStorage, đồng bộ trạng thái đã phê duyệt
  const recentDocs = (() => {
    try {
      const saved = localStorage.getItem('taxkeepvn_uploaded_documents')
      const docs = saved ? JSON.parse(saved) : []
      const approvedList = JSON.parse(localStorage.getItem('taxkeepvn_approved_rulesets') || '[]')
      return docs.map((d) => {
        const docId = d.id || d.ruleSetId || d.extractedData?.taxRuleSet?.ruleSetId
        const docYear = d.taxYear || d.extractedData?.taxRuleSet?.taxYear
        if ((docId && approvedList.includes(docId)) || (docYear && approvedList.includes(String(docYear)))) {
          return { ...d, status: 'Active' }
        }
        return d
      })
    } catch {
      return []
    }
  })()

  const handleUploadSuccess = (data) => {
    setExtractedData(data)
    try {
      sessionStorage.setItem('taxkeep_extracted_data', JSON.stringify(data))
    } catch {
      // Bỏ qua lỗi lưu sessionStorage
    }
    navigate('/admin/quy-tac-thue')
  }

  const handleApproveSuccess = (updatedData) => {
    setExtractedData(updatedData)
    try {
      sessionStorage.setItem('taxkeep_extracted_data', JSON.stringify(updatedData))
    } catch {
      // Bỏ qua lỗi lưu sessionStorage
    }
  }

  const currentRoute = section

  const breadcrumbTitle =
    currentRoute === 'boc-tach-van-ban-ai'
      ? 'Tải lên & Trích xuất AI'
      : currentRoute === 'quy-tac-thue'
      ? 'Thẩm định & Phê duyệt'
      : currentRoute === 'van-ban-quy-pham'
      ? 'Danh mục văn bản quy phạm'
      : currentRoute === 'lich-su-phe-duyet'
      ? 'Lịch sử phê duyệt'
      : currentRoute === 'cai-dat'
      ? 'Cài đặt hệ thống'
      : 'Tổng quan hệ thống'

  return (
    <AdminLayout
      currentRoute={currentRoute}
      onNavigate={(route) => navigate(`/admin/${route}`)}
      breadcrumbTitle={breadcrumbTitle}
      onLogout={onLogout}
    >
      {/* Route 1: Tải lên và bóc tách AI */}
      {currentRoute === 'boc-tach-van-ban-ai' && (
        <TaxDocumentUploadPage
          onUploadSuccess={handleUploadSuccess}
          onCancel={() => navigate('/admin/quy-tac-thue')}
        />
      )}

      {/* Route 2: Thẩm định và phê duyệt quy tắc thuế */}
      {currentRoute === 'quy-tac-thue' && (
        <TaxRuleReviewPage
          extractedData={extractedData}
          onBackToUpload={() => navigate('/admin/boc-tach-van-ban-ai')}
          onApproveSuccess={handleApproveSuccess}
        />
      )}

      {/* Route 3: Văn bản quy phạm & Quy tắc hồ sơ NPT */}
      {currentRoute === 'van-ban-quy-pham' && (
        <AdminDependentRulesPage />
      )}

      {/* Route 4: Cài đặt tài khoản & Hồ sơ */}
      {currentRoute === 'cai-dat' && (
        <AdminProfileSettings />
      )}

      {/* Route 5: Tổng quan hệ thống */}
      {currentRoute === 'tong-quan' && (
        <div className="p-space-xl flex flex-col gap-space-lg">
          {/* Header Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-primary to-primary-container p-space-xl text-on-primary flex flex-col md:flex-row md:items-center justify-between gap-space-md shadow-md">
            <div className="flex flex-col gap-space-xs">
              <span className="font-label-sm uppercase tracking-widest text-secondary-fixed font-bold">
                BẢNG ĐIỀU KHIỂN QUẢN TRỊ VIÊN
              </span>
              <h1 className="font-headline-lg text-headline-lg font-bold">
                Xin chào, {user?.fullName || 'Quản trị viên'}!
              </h1>
              <p className="font-body-md text-on-primary/80 max-w-xl">
                Chào mừng bạn đến với Hệ thống Quản lý Thuế Thu nhập Cá nhân TAX KEEP VN. Quản lý bóc tách văn bản quy phạm và giám sát các quy tắc thuế điện tử.
              </p>
            </div>
            <div className="flex items-center gap-space-sm self-start md:self-auto">
              <button
                onClick={() => navigate('/admin/boc-tach-van-ban-ai')}
                className="px-space-lg py-space-sm rounded-xl bg-secondary text-on-secondary font-title-sm text-title-sm font-bold shadow-md hover:opacity-90 transition-all flex items-center gap-space-xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">upload_file</span>
                <span>Tải văn bản thuế</span>
              </button>
            </div>
          </div>

          {/* Service Status Cards */}
          {/* Service Status Cards (Connected via API Gateway) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
            <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex items-start gap-space-md border border-outline-variant/30">
              <div className="w-12 h-12 rounded-xl bg-primary-container/40 flex items-center justify-center text-primary shrink-0">
                <span className="material-symbols-outlined text-[26px]">hub</span>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="font-label-sm text-label-sm font-bold text-on-surface uppercase tracking-wider">
                    API Gateway
                  </span>
                </div>
                <span className="font-title-sm text-title-sm font-bold text-primary mt-1">
                  YARP Port 5000
                </span>
                <span className="font-body-sm text-on-surface-variant text-[12px] mt-0.5 truncate">
                  Reverse Proxy • Unified
                </span>
              </div>
            </div>

            <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex items-start gap-space-md border border-outline-variant/30">
              <div className="w-12 h-12 rounded-xl bg-secondary-container/40 flex items-center justify-center text-secondary shrink-0">
                <span className="material-symbols-outlined text-[26px]">smart_toy</span>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="font-label-sm text-label-sm font-bold text-on-surface uppercase tracking-wider">
                    AI Service
                  </span>
                </div>
                <span className="font-title-sm text-title-sm font-bold text-primary mt-1">
                  FastAPI Port 8000
                </span>
                <span className="font-body-sm text-on-surface-variant text-[12px] mt-0.5 truncate">
                  Gemini 2.5 Flash • Bóc tách
                </span>
              </div>
            </div>

            <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex items-start gap-space-md border border-outline-variant/30">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <span className="material-symbols-outlined text-[26px]">dns</span>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="font-label-sm text-label-sm font-bold text-on-surface uppercase tracking-wider">
                    Core Backend
                  </span>
                </div>
                <span className="font-title-sm text-title-sm font-bold text-primary mt-1">
                  .NET Core Port 5023
                </span>
                <span className="font-body-sm text-on-surface-variant text-[12px] mt-0.5 truncate">
                  Auth • Profile • NPT
                </span>
              </div>
            </div>

            <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex items-start gap-space-md border border-outline-variant/30">
              <div className="w-12 h-12 rounded-xl bg-secondary-container/40 flex items-center justify-center text-secondary shrink-0">
                <span className="material-symbols-outlined text-[26px]">gavel</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-label-sm text-label-sm font-bold text-on-surface uppercase tracking-wider">
                  Văn bản đã bóc tách
                </span>
                <span className="font-title-sm text-title-sm font-bold text-primary mt-1">
                  {recentDocs.length} tài liệu lưu trữ
                </span>
                <span className="font-body-sm text-on-surface-variant text-[12px] mt-0.5 truncate">
                  Lưu trữ phiên làm việc
                </span>
              </div>
            </div>
          </div>

          {/* Quick Navigation & Recent Uploads */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md">
            {/* Quick Actions List */}
            <div className="lg:col-span-5 bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col gap-space-md">
              <h3 className="font-title-md text-title-md font-bold text-on-surface">
                Tính năng quản trị chính
              </h3>
              <div className="flex flex-col gap-space-sm">
                <button
                  onClick={() => navigate('/admin/boc-tach-van-ban-ai')}
                  className="p-space-md rounded-xl bg-surface-container-low hover:bg-surface-container transition-all flex items-center justify-between text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-space-md">
                    <div className="w-10 h-10 rounded-lg bg-primary text-on-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-[22px]">document_scanner</span>
                    </div>
                    <div>
                      <h4 className="font-title-sm text-title-sm font-bold text-on-surface group-hover:text-primary transition-colors">
                        Tải lên văn bản thuế AI
                      </h4>
                      <p className="font-body-sm text-on-surface-variant text-[12px]">
                        Nạp tệp PDF luật thuế để AI tự động trích xuất
                      </p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors">
                    chevron_right
                  </span>
                </button>

                <button
                  onClick={() => navigate('/admin/quy-tac-thue')}
                  className="p-space-md rounded-xl bg-surface-container-low hover:bg-surface-container transition-all flex items-center justify-between text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-space-md">
                    <div className="w-10 h-10 rounded-lg bg-secondary text-on-secondary flex items-center justify-center">
                      <span className="material-symbols-outlined text-[22px]">account_balance</span>
                    </div>
                    <div>
                      <h4 className="font-title-sm text-title-sm font-bold text-on-surface group-hover:text-secondary transition-colors">
                        Thẩm định & Phê duyệt
                      </h4>
                      <p className="font-body-sm text-on-surface-variant text-[12px]">
                        Xem xét 4 nhóm quy tắc thuế và kích hoạt Active
                      </p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-outline group-hover:text-secondary transition-colors">
                    chevron_right
                  </span>
                </button>
              </div>
            </div>

            {/* Recent Uploads Table */}
            <div className="lg:col-span-7 bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col gap-space-md">
              <div className="flex items-center justify-between">
                <h3 className="font-title-md text-title-md font-bold text-on-surface">
                  Văn bản vừa xử lý gần đây
                </h3>
                {recentDocs.length > 0 && (
                  <span className="text-[12px] text-on-surface-variant font-medium">
                    {recentDocs.length} tài liệu
                  </span>
                )}
              </div>

              {recentDocs.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-body-sm">
                    <thead>
                      <tr className="border-b border-surface-container-high text-on-surface-variant text-[11px] uppercase tracking-wider font-bold">
                        <th className="pb-2">Tên văn bản</th>
                        <th className="pb-2 text-center">Năm</th>
                        <th className="pb-2 text-center">Quy tắc</th>
                        <th className="pb-2 text-center">Trạng thái</th>
                        <th className="pb-2 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container-high/40">
                      {recentDocs.slice(0, 5).map((doc, i) => (
                        <tr key={doc.id || i} className="hover:bg-surface-container-low/40">
                          <td className="py-2.5 font-medium text-on-surface max-w-[200px] truncate">
                            {doc.name}
                          </td>
                          <td className="py-2.5 text-center font-bold text-primary">
                            {doc.taxYear}
                          </td>
                          <td className="py-2.5 text-center font-mono">
                            {doc.rulesCount || '—'}
                          </td>
                          <td className="py-2.5 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-secondary-container/30 text-secondary">
                              {doc.status === 'ACTIVE' || doc.status === 'Active' ? 'Hiệu lực' : 'Bản nháp'}
                            </span>
                          </td>
                          <td className="py-2.5 text-right">
                            <button
                              onClick={() => {
                                if (doc.extractedData) {
                                  setExtractedData(doc.extractedData)
                                  sessionStorage.setItem('taxkeep_extracted_data', JSON.stringify(doc.extractedData))
                                }
                                navigate('/admin/quy-tac-thue')
                              }}
                              className="px-2.5 py-1 rounded bg-primary text-on-primary text-[11px] font-semibold hover:bg-primary-container transition-colors cursor-pointer"
                            >
                              Xem lại
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center text-on-surface-variant flex flex-col items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[32px] text-outline">inbox</span>
                  <p className="text-body-sm">Chưa có văn bản nào được tải lên trong phiên làm việc này.</p>
                  <button
                    onClick={() => navigate('/admin/boc-tach-van-ban-ai')}
                    className="mt-1 px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold cursor-pointer"
                  >
                    Bắt đầu tải lên ngay
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fallback cho các mục đang phát triển */}
      {currentRoute !== 'boc-tach-van-ban-ai' &&
        currentRoute !== 'quy-tac-thue' &&
        currentRoute !== 'van-ban-quy-pham' &&
        currentRoute !== 'cai-dat' &&
        currentRoute !== 'tong-quan' && (
          <div className="p-space-xl flex flex-col items-center justify-center min-h-[60vh] text-center gap-space-md">
            <div className="w-16 h-16 rounded-full bg-secondary-container/40 flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[36px]">construction</span>
            </div>
            <h2 className="font-headline-md text-headline-md font-bold text-on-surface">
              Tính năng đang hoàn thiện
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
              Chuyên mục <strong className="text-primary font-semibold">{breadcrumbTitle}</strong> đang được đồng bộ với Cơ sở dữ liệu quốc gia. Vui lòng sử dụng tính năng bóc tách AI hoặc quản lý quy tắc thuế.
            </p>
            <button
              onClick={() => navigate('/admin/boc-tach-van-ban-ai')}
              className="px-space-lg py-2 rounded-lg bg-primary text-on-primary font-title-sm text-title-sm font-semibold hover:bg-primary-container transition-all cursor-pointer"
            >
              Quay lại Tải lên văn bản thuế
            </button>
          </div>
        )}
    </AdminLayout>
  )
}
