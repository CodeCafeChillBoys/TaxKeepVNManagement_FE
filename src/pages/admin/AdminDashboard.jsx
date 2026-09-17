import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { AdminLayout } from '@/layouts/AdminLayout'
import { TaxDocumentUploadPage } from './TaxDocumentUploadPage'
import { TaxRuleReviewPage } from './TaxRuleReviewPage'
import { AdminProfileSettings } from './AdminProfileSettings'
import { AdminSystemSettingsPage } from './AdminSystemSettingsPage'
import { AdminDependentRulesPage } from './AdminDependentRulesPage'
import { AdminApprovalHistoryPage } from './AdminApprovalHistoryPage'
import { taxRuleService } from '@/services/taxRuleService'
import { useAuth } from '@/hooks/useAuth'

export function AdminDashboard({ onLogout }) {
  const { section = 'boc-tach-van-ban-ai', id: routeId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const activeRuleSetId =
    routeId ||
    searchParams.get('id') ||
    searchParams.get('ruleSetId') ||
    ''

  // Dữ liệu bóc tách chỉ lưu trong React State của phiên làm việc, không lưu bộ nhớ tạm Client
  const [extractedData, setExtractedData] = useState(() => {
    // Dọn sạch các key bộ nhớ tạm cũ nếu còn lưu trên trình duyệt
    try {
      sessionStorage.removeItem('taxkeep_extracted_data')
      localStorage.removeItem('taxkeepvn_uploaded_documents')
      localStorage.removeItem('taxkeepvn_approved_rulesets')
    } catch {
      // Bỏ qua
    }
    return null
  })

  // Ghi nhớ mã bộ quy tắc thuế đang làm việc trong phiên (In-Memory React State)
  const [lastRuleSetId, setLastRuleSetId] = useState(activeRuleSetId || null)
  // Danh sách các bộ quy tắc đã lưu trữ trên cơ sở dữ liệu hệ thống
  const [savedRuleSets, setSavedRuleSets] = useState([])

  const currentRoute = section

  // Tải danh sách bộ quy tắc từ CSDL để thiết lập mã bộ quy tắc ban đầu
  useEffect(() => {
    taxRuleService
      .getAllRuleSets()
      .then((res) => {
        const list = Array.isArray(res) ? res : (res?.data || [])
        setSavedRuleSets(list)
        if (!lastRuleSetId && list.length > 0) {
          const activeSet =
            list.find((s) => String(s.status).toUpperCase() === 'ACTIVE') || list[0]
          if (activeSet?.ruleSetId) {
            setLastRuleSetId(activeSet.ruleSetId)
          }
        }
      })
      .catch((err) => {
        console.warn('Lỗi khi tải danh mục bộ quy tắc:', err)
      })
  }, [])

  // Đồng bộ ID từ URL hoặc tự động khôi phục URL kèm ?id= khi chuyển lại tab Quy tắc thuế
  useEffect(() => {
    const queryId =
      routeId ||
      searchParams.get('id') ||
      searchParams.get('ruleSetId')
    if (queryId) {
      setLastRuleSetId(queryId)
    } else if (currentRoute === 'quy-tac-thue') {
      const idToUse =
        lastRuleSetId ||
        extractedData?.ruleSetId ||
        extractedData?.taxRuleSet?.ruleSetId ||
        extractedData?.id ||
        savedRuleSets.find((s) => String(s.status).toUpperCase() === 'ACTIVE')?.ruleSetId ||
        savedRuleSets[0]?.ruleSetId
      if (idToUse && idToUse !== 'current') {
        navigate(`/admin/quy-tac-thue?id=${idToUse}`, { replace: true })
      }
    }
  }, [currentRoute, searchParams, routeId, lastRuleSetId, extractedData, savedRuleSets, navigate])

  // Danh sách tài liệu: Kết hợp phiên làm việc và tài liệu đã lưu trên CSDL
  const recentDocs = [
    ...(extractedData
      ? [
          {
            id:
              extractedData.ruleSetId ||
              extractedData.taxRuleSet?.ruleSetId ||
              lastRuleSetId ||
              'current',
            name:
              extractedData.taxRuleSet?.name ||
              (extractedData.taxRuleSet?.taxYear
                ? `Quy tắc thuế năm ${extractedData.taxRuleSet.taxYear}`
                : 'Văn bản thuế'),
            taxYear: extractedData.taxRuleSet?.taxYear || '—',
            rulesCount: extractedData.taxRules?.length || 'Đầy đủ',
            status: extractedData.status || extractedData.taxRuleSet?.status || 'Draft',
            extractedData: extractedData,
          },
        ]
      : []),
    ...savedRuleSets
      .filter(
        (s) =>
          s.ruleSetId !== (extractedData?.ruleSetId || extractedData?.taxRuleSet?.ruleSetId)
      )
      .map((s) => ({
        id: s.ruleSetId,
        ruleSetId: s.ruleSetId,
        name: s.name || `Quy tắc thuế năm ${s.taxYear}`,
        taxYear: s.taxYear || '—',
        rulesCount: 'Đầy đủ',
        status: s.status || 'Active',
      })),
  ]

  const handleUploadSuccess = (data) => {
    setExtractedData(data)
    const targetId = data?.ruleSetId || data?.taxRuleSet?.ruleSetId || data?.id
    if (targetId) {
      setLastRuleSetId(targetId)
      navigate(`/admin/quy-tac-thue?id=${targetId}`)
    } else {
      navigate('/admin/quy-tac-thue')
    }
  }

  const handleApproveSuccess = (updatedData) => {
    setExtractedData(updatedData)
    const targetId = updatedData?.ruleSetId || updatedData?.taxRuleSet?.ruleSetId || updatedData?.id
    if (targetId) {
      setLastRuleSetId(targetId)
      setSavedRuleSets((prev) =>
        prev.map((s) => (s.ruleSetId === targetId ? { ...s, status: 'Active' } : s))
      )
    }
  }

  // Đồng bộ dữ liệu chi tiết khi TaxRuleReviewPage tải từ API GET /api/tax-rules/{id}
  const handleDataLoaded = useCallback((data) => {
    if (!data) return
    setExtractedData((prev) => {
      if (!prev) return data
      return {
        ...prev,
        ...data,
        verification: data.verification || prev.verification || null,
        warning: data.warning || prev.warning || null,
      }
    })
    const id = data.ruleSetId || data.taxRuleSet?.ruleSetId || data.id
    if (id) {
      setLastRuleSetId(id)
    }
  }, [])

  // Điều hướng thông minh: Giữ nguyên mã bộ quy tắc khi chuyển giữa các tab sidebar
  const handleNavigation = (route) => {
    if (route === 'quy-tac-thue') {
      const idToUse =
        activeRuleSetId ||
        lastRuleSetId ||
        extractedData?.ruleSetId ||
        extractedData?.taxRuleSet?.ruleSetId ||
        extractedData?.id ||
        savedRuleSets.find((s) => String(s.status).toUpperCase() === 'ACTIVE')?.ruleSetId ||
        savedRuleSets[0]?.ruleSetId ||
        (recentDocs[0]?.id !== 'current' ? recentDocs[0]?.id : null)
      if (idToUse) {
        navigate(`/admin/quy-tac-thue?id=${idToUse}`)
        return
      }
    }
    navigate(`/admin/${route}`)
  }

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
      ? 'Cấu hình hệ thống'
      : currentRoute === 'ho-so'
      ? 'Hồ sơ cá nhân & Bảo mật'
      : 'Tổng quan hệ thống'

  return (
    <AdminLayout
      currentRoute={currentRoute}
      onNavigate={handleNavigation}
      breadcrumbTitle={breadcrumbTitle}
      onLogout={onLogout}
    >
      {/* Route 1: Tải lên và bóc tách AI */}
      {currentRoute === 'boc-tach-van-ban-ai' && (
        <TaxDocumentUploadPage
          onUploadSuccess={handleUploadSuccess}
          onCancel={() => handleNavigation('quy-tac-thue')}
        />
      )}

      {/* Route 2: Thẩm định và phê duyệt quy tắc thuế */}
      {currentRoute === 'quy-tac-thue' && (
        <TaxRuleReviewPage
          extractedData={extractedData}
          ruleSetId={activeRuleSetId || lastRuleSetId}
          onBackToUpload={() => navigate('/admin/boc-tach-van-ban-ai')}
          onApproveSuccess={handleApproveSuccess}
          onDataLoaded={handleDataLoaded}
        />
      )}

      {/* Route 3: Văn bản quy phạm & Quy tắc hồ sơ NPT */}
      {currentRoute === 'van-ban-quy-pham' && (
        <AdminDependentRulesPage />
      )}

      {/* Route 4: Cấu hình hệ thống */}
      {currentRoute === 'cai-dat' && (
        <AdminSystemSettingsPage />
      )}

      {/* Route 5: Hồ sơ cá nhân & Đổi mật khẩu (từ submenu avatar góc dưới màn hình) */}
      {currentRoute === 'ho-so' && (
        <AdminProfileSettings />
      )}

      {/* Route 5: Lịch sử phê duyệt & Lưu trữ văn bản quy phạm */}
      {currentRoute === 'lich-su-phe-duyet' && (
        <AdminApprovalHistoryPage
          initialYear={searchParams.get('year') || searchParams.get('taxYear')}
          onNavigateToReview={(ruleSetId) => {
            if (ruleSetId) {
              navigate(`/admin/quy-tac-thue?id=${ruleSetId}`)
            } else {
              navigate('/admin/quy-tac-thue')
            }
          }}
        />
      )}

      {/* Route 6: Tổng quan hệ thống */}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
            <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex items-start gap-space-md border border-outline-variant/30">
              <div className="w-12 h-12 rounded-xl bg-primary-container/40 flex items-center justify-center text-primary shrink-0">
                <span className="material-symbols-outlined text-[26px]">hub</span>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="font-label-sm text-label-sm font-bold text-on-surface uppercase tracking-wider">
                    Cổng liên thông
                  </span>
                </div>
                <span className="font-title-sm text-title-sm font-bold text-primary mt-1">
                  Trực tuyến • Sẵn sàng
                </span>
                <span className="font-body-sm text-on-surface-variant text-[12px] mt-0.5 truncate">
                  Đồng bộ dữ liệu tập trung
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
                    Trí tuệ nhân tạo
                  </span>
                </div>
                <span className="font-title-sm text-title-sm font-bold text-primary mt-1">
                  Sẵn sàng trích xuất
                </span>
                <span className="font-body-sm text-on-surface-variant text-[12px] mt-0.5 truncate">
                  Tự động phân loại quy tắc
                </span>
              </div>
            </div>

            <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex items-start gap-space-md border border-outline-variant/30">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <span className="material-symbols-outlined text-[26px]">account_balance</span>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="font-label-sm text-label-sm font-bold text-on-surface uppercase tracking-wider">
                    Nghiệp vụ quản lý
                  </span>
                </div>
                <span className="font-title-sm text-title-sm font-bold text-primary mt-1">
                  Kết nối ổn định
                </span>
                <span className="font-body-sm text-on-surface-variant text-[12px] mt-0.5 truncate">
                  Hồ sơ giảm trừ &amp; NPT
                </span>
              </div>
            </div>

            <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex items-start gap-space-md border border-outline-variant/30">
              <div className="w-12 h-12 rounded-xl bg-secondary-container/40 flex items-center justify-center text-secondary shrink-0">
                <span className="material-symbols-outlined text-[26px]">gavel</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-label-sm text-label-sm font-bold text-on-surface uppercase tracking-wider">
                  Văn bản quy phạm
                </span>
                <span className="font-title-sm text-title-sm font-bold text-primary mt-1">
                  {recentDocs.length} tài liệu lưu trữ
                </span>
                <span className="font-body-sm text-on-surface-variant text-[12px] mt-0.5 truncate">
                  Đã ghi nhận trong phiên
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
                  onClick={() => handleNavigation('quy-tac-thue')}
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
                                }
                                const targetId = doc.id || doc.ruleSetId || doc.extractedData?.taxRuleSet?.ruleSetId
                                if (targetId && targetId !== 'current') {
                                  setLastRuleSetId(targetId)
                                  navigate(`/admin/quy-tac-thue?id=${targetId}`)
                                } else {
                                  handleNavigation('quy-tac-thue')
                                }
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
        currentRoute !== 'ho-so' &&
        currentRoute !== 'lich-su-phe-duyet' &&
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
