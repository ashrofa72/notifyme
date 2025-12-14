import React, { useState, useMemo, useEffect } from 'react';
import { Student, ClassOption, AttendanceStatus, NotificationLog } from '../types';
import { sendFCMNotification, requestBrowserToken } from '../services/fcmService';
import { Filter, Send, RotateCcw, Check, AlertCircle, Clock, Loader2, ArrowLeft, MinusSquare, CheckSquare, Square, X, Save, Smartphone, Zap } from 'lucide-react';

interface AttendanceViewProps {
  students: Student[];
  onUpdateStudentStatus: (studentCode: string, status: AttendanceStatus) => void;
  onNotificationsSent: (logs: NotificationLog[]) => void;
  onMarkNotificationSent: (studentCode: string) => void;
  onFetchClassData?: (grade: string, className: string) => Promise<void>;
  onUpdateStudentToken: (studentCode: string, token: string) => Promise<void>;
  classes: ClassOption[];
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  students,
  onUpdateStudentStatus,
  onNotificationsSent,
  onMarkNotificationSent,
  onFetchClassData,
  onUpdateStudentToken,
  classes
}) => {
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());

  // Modal State
  const [editingTokenStudent, setEditingTokenStudent] = useState<Student | null>(null);
  const [newTokenValue, setNewTokenValue] = useState('');
  const [isSavingToken, setIsSavingToken] = useState(false);
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);

  // Trigger fetch when class 1-1 is selected (Auto-sync hook)
  useEffect(() => {
    const loadData = async () => {
      if (selectedGrade === '1' && selectedClass === '1' && onFetchClassData) {
        setIsFetchingData(true);
        try {
            await onFetchClassData(selectedGrade, selectedClass);
        } finally {
            setIsFetchingData(false);
        }
      }
    };
    loadData();
  }, [selectedGrade, selectedClass, onFetchClassData]);

  // Reset selection when class changes
  useEffect(() => {
    setSelectedCodes(new Set());
  }, [selectedGrade, selectedClass]);

  // Dynamically calculate available classes based on Loaded Students + Mock Config
  const availableClasses = useMemo<ClassOption[]>(() => {
    const fromStudents = students.map(s => ({ grade: s.grade, className: s.className }));
    const all = [...classes, ...fromStudents];
    
    const uniqueMap = new Map<string, ClassOption>();
    all.forEach(c => {
        const key = `${c.grade}-${c.className}`;
        if (!uniqueMap.has(key)) uniqueMap.set(key, c);
    });
    return Array.from(uniqueMap.values());
  }, [students, classes]);

  const grades = useMemo(() => {
      return (Array.from(new Set(availableClasses.map(c => c.grade))) as string[]).sort((a, b) => {
        const numA = parseInt(a);
        const numB = parseInt(b);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.localeCompare(b);
      });
  }, [availableClasses]);

  const classOptions = useMemo(() => {
      return availableClasses
        .filter(c => c.grade === selectedGrade)
        .sort((a, b) => {
            const numA = parseInt(a.className);
            const numB = parseInt(b.className);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a.className.localeCompare(b.className);
        });
  }, [availableClasses, selectedGrade]);

  // Filter Logic
  const filteredStudents = useMemo(() => {
    if (!selectedGrade || !selectedClass) return [];
    return students.filter(
      (s) => s.grade === selectedGrade && s.className === selectedClass
    );
  }, [students, selectedGrade, selectedClass]);

  // Students eligible for notification (Absent/Late and not sent yet)
  const eligibleStudents = useMemo(() => {
    return filteredStudents.filter(s => s.status !== 'Present' && !s.notificationSent);
  }, [filteredStudents]);

  // Detect if there are students available in OTHER classes when the current one is empty
  const alternativeClass = useMemo(() => {
    if (filteredStudents.length === 0 && students.length > 0) {
        const counts = new Map<string, number>();
        students.forEach(s => {
            const k = `${s.grade}|${s.className}`;
            counts.set(k, (counts.get(k) || 0) + 1);
        });
        
        let bestKey = '';
        let maxCount = 0;
        counts.forEach((v, k) => {
            if (v > maxCount) {
                maxCount = v;
                bestKey = k;
            }
        });

        if (bestKey) {
            const [g, c] = bestKey.split('|');
            if (g !== selectedGrade || c !== selectedClass) {
                return { grade: g, className: c, count: maxCount };
            }
        }
    }
    return null;
  }, [filteredStudents, students, selectedGrade, selectedClass]);

  // Selection Handlers
  const handleSelectAll = () => {
    if (selectedCodes.size === eligibleStudents.length && eligibleStudents.length > 0) {
        setSelectedCodes(new Set()); // Deselect all
    } else {
        setSelectedCodes(new Set(eligibleStudents.map(s => s.studentCode)));
    }
  };

  const toggleSelection = (code: string) => {
    const newSet = new Set(selectedCodes);
    if (newSet.has(code)) {
        newSet.delete(code);
    } else {
        newSet.add(code);
    }
    setSelectedCodes(newSet);
  };

  // Wrapper for status update to handle auto-selection
  const handleStatusChangeWithAutoSelect = (studentCode: string, status: AttendanceStatus) => {
    onUpdateStudentStatus(studentCode, status);
    
    // UX Enhancement: If marking Absent/Late, auto-select them for sending.
    // If marking Present, deselect them.
    setSelectedCodes(prev => {
        const newSet = new Set(prev);
        if (status !== 'Present') {
            newSet.add(studentCode);
        } else {
            newSet.delete(studentCode);
        }
        return newSet;
    });

    // Check if token is missing and trigger prompt if status is Absent or Late
    if (status !== 'Present') {
        const student = students.find(s => s.studentCode === studentCode);
        if (student && (!student.fcmToken || student.fcmToken.length < 10)) {
            setEditingTokenStudent(student);
            setNewTokenValue('');
        }
    }
  };

  const handleGenerateBrowserToken = async () => {
    setIsGeneratingToken(true);
    try {
        const token = await requestBrowserToken();
        if (token) {
            setNewTokenValue(token);
        } else {
            alert("تعذر إنشاء رمز (Token). الرجاء التأكد من السماح بالإشعارات في المتصفح.");
        }
    } catch (e) {
        console.error(e);
        alert("حدث خطأ أثناء محاولة توليد الرمز.");
    } finally {
        setIsGeneratingToken(false);
    }
  };

  const handleSaveToken = async () => {
    if (!editingTokenStudent || !newTokenValue.trim()) return;
    setIsSavingToken(true);
    await onUpdateStudentToken(editingTokenStudent.studentCode, newTokenValue.trim());
    setIsSavingToken(false);
    setEditingTokenStudent(null);
  };

  const handleSendSelected = async () => {
    if (selectedCodes.size === 0) return;

    const studentsToNotify = filteredStudents.filter(
      (s) => selectedCodes.has(s.studentCode)
    );

    setIsSending(true);
    const newLogs: NotificationLog[] = [];

    for (const student of studentsToNotify) {
      const log = await sendFCMNotification(student);
      newLogs.push(log);
      if (log.status === 'Sent') {
        onMarkNotificationSent(student.studentCode);
        // Remove from selection after successful send
        setSelectedCodes(prev => {
            const next = new Set(prev);
            next.delete(student.studentCode);
            return next;
        });
      }
    }

    onNotificationsSent(newLogs);
    setIsSending(false);
    
    // Improved Reporting Logic
    const sentCount = newLogs.filter(l => l.status === 'Sent').length;
    const failedCount = newLogs.filter(l => l.status === 'Failed').length;

    if (failedCount > 0) {
        // Collect unique error messages
        const errors = Array.from(new Set(newLogs.filter(l => l.status === 'Failed').map(l => l.message)));
        const errorSummary = errors.map(e => `• ${e}`).join('\n');
        
        alert(`تم إرسال ${sentCount} إشعار بنجاح.\nفشل إرسال ${failedCount} إشعار.\n\nأسباب الفشل:\n${errorSummary}`);
    } else {
        alert(`تم إرسال ${sentCount} إشعار بنجاح.`);
    }
  };

  const isAllSelected = eligibleStudents.length > 0 && selectedCodes.size === eligibleStudents.length;
  const isIndeterminate = selectedCodes.size > 0 && selectedCodes.size < eligibleStudents.length;

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">تسجيل الحضور</h2>
          <p className="text-sm text-gray-500">اختر الصف والفصل لإدارة الحضور اليومي.</p>
        </div>

        <div className="flex items-center space-x-3 rtl:space-x-reverse bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
          <Filter className="w-4 h-4 text-gray-400 ml-2 rtl:ml-0 rtl:mr-2" />
          <select
            className="bg-transparent border-none text-sm font-medium focus:ring-0 text-gray-700 outline-none"
            value={selectedGrade}
            onChange={(e) => {
              setSelectedGrade(e.target.value);
              setSelectedClass(''); // Reset class when grade changes
            }}
          >
            <option value="">اختر الصف</option>
            {grades.map(g => <option key={g} value={g}>الصف {g}</option>)}
          </select>
          
          <div className="h-6 w-px bg-gray-200"></div>

          <select
            className="bg-transparent border-none text-sm font-medium focus:ring-0 text-gray-700 outline-none disabled:opacity-50"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            disabled={!selectedGrade}
          >
            <option value="">اختر الفصل</option>
            {classOptions.map(c => (
              <option key={c.className} value={c.className}>{c.className}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        {!selectedGrade || !selectedClass ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <UsersPlaceholder />
            <p className="mt-4 font-medium">الرجاء اختيار الصف والفصل للبدء</p>
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-2">
                <div className="text-sm text-gray-600 font-medium">
                  عرض {filteredStudents.length} طالب
                </div>
                {isFetchingData && (
                  <div className="flex items-center text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                    <Loader2 className="w-3 h-3 animate-spin ml-1" />
                    جاري المزامنة...
                  </div>
                )}
              </div>
              <button
                onClick={handleSendSelected}
                disabled={selectedCodes.size === 0 || isSending}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all shadow-sm
                  ${selectedCodes.size > 0 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
              >
                {isSending ? (
                  <RotateCcw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 rtl:rotate-180" />
                )}
                <span>إرسال ({selectedCodes.size})</span>
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-white text-xs uppercase text-gray-500 font-semibold tracking-wider border-b border-gray-100">
                    <th className="px-6 py-4 w-12 text-center">
                        <button 
                            onClick={handleSelectAll}
                            disabled={eligibleStudents.length === 0}
                            className="text-gray-500 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            {isAllSelected ? <CheckSquare className="w-5 h-5 text-blue-600" /> : 
                             isIndeterminate ? <MinusSquare className="w-5 h-5 text-blue-600" /> :
                             <Square className="w-5 h-5" />}
                        </button>
                    </th>
                    <th className="px-6 py-4 text-right">رقم الطالب</th>
                    <th className="px-6 py-4 text-right">اسم الطالب</th>
                    <th className="px-6 py-4 text-right">معلومات الولي</th>
                    <th className="px-6 py-4 text-center">حالة الحضور</th>
                    <th className="px-6 py-4 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredStudents.length === 0 && !isFetchingData ? (
                      <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                             <div className="flex flex-col items-center gap-2">
                                <span>لا يوجد طلاب في الصف {selectedGrade} - الفصل {selectedClass}.</span>
                                
                                {alternativeClass && (
                                    <button 
                                        onClick={() => {
                                            setSelectedGrade(alternativeClass.grade);
                                            setSelectedClass(alternativeClass.className);
                                        }}
                                        className="mt-2 flex items-center space-x-2 rtl:space-x-reverse bg-blue-50 text-blue-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                        <span>وجدنا {alternativeClass.count} طالب في الصف {alternativeClass.grade} - الفصل {alternativeClass.className}. عرضهم؟</span>
                                    </button>
                                )}
                             </div>
                          </td>
                      </tr>
                  ) : filteredStudents.map((student) => {
                    const isSelectable = student.status !== 'Present' && !student.notificationSent;
                    const isSelected = selectedCodes.has(student.studentCode);

                    return (
                        <tr key={student.studentCode} className={`transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                        <td className="px-6 py-4 text-center">
                            <button
                                onClick={() => toggleSelection(student.studentCode)}
                                disabled={!isSelectable}
                                className={`transition-colors ${!isSelectable ? 'opacity-30 cursor-not-allowed' : 'hover:text-blue-600 cursor-pointer'}`}
                            >
                                {isSelected ? (
                                    <CheckSquare className="w-5 h-5 text-blue-600" />
                                ) : (
                                    <Square className="w-5 h-5 text-gray-400" />
                                )}
                            </button>
                        </td>
                        <td className="px-6 py-4 text-sm font-mono text-gray-500">
                            {student.studentCode}
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900">
                            {student.studentName}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                            <div>{student.parentName}</div>
                            <div className="text-xs text-gray-400 text-left dir-ltr">{student.parentPhone}</div>
                        </td>
                        <td className="px-6 py-4">
                            <div className="flex items-center justify-center space-x-1 rtl:space-x-reverse bg-gray-100 p-1 rounded-lg w-max mx-auto">
                            <StatusButton 
                                current={student.status} 
                                target="Present" 
                                icon={Check}
                                label="حاضر"
                                color="text-green-600 bg-green-50"
                                onClick={() => handleStatusChangeWithAutoSelect(student.studentCode, 'Present')} 
                            />
                            <StatusButton 
                                current={student.status} 
                                target="Late" 
                                icon={Clock}
                                label="متأخر"
                                color="text-yellow-600 bg-yellow-50"
                                onClick={() => handleStatusChangeWithAutoSelect(student.studentCode, 'Late')} 
                            />
                            <StatusButton 
                                current={student.status} 
                                target="Absent" 
                                icon={AlertCircle}
                                label="غائب"
                                color="text-red-600 bg-red-50"
                                onClick={() => handleStatusChangeWithAutoSelect(student.studentCode, 'Absent')} 
                            />
                            </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                            {student.notificationSent ? (
                            <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded">تم الإرسال</span>
                            ) : student.status !== 'Present' ? (
                            <span className="text-xs font-medium text-orange-500 bg-orange-50 px-2 py-1 rounded">قيد الانتظار</span>
                            ) : (
                            <span className="text-gray-300">-</span>
                            )}
                        </td>
                        </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Manual Token Entry Modal */}
      {editingTokenStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-orange-100 p-2 rounded-full">
                            <Smartphone className="w-6 h-6 text-orange-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">إضافة رمز جهاز (Token)</h3>
                            <p className="text-sm text-gray-500">للطالب: {editingTokenStudent.studentName}</p>
                        </div>
                    </div>
                    <button onClick={() => setEditingTokenStudent(null)} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                        هذا الطالب لا يملك رمز جهاز مسجل. بدون هذا الرمز، لن يتم إرسال الإشعار.
                    </p>
                    
                    <div className="flex justify-between items-end mb-1">
                        <label className="block text-sm font-medium text-gray-700">FCM Token</label>
                        <button 
                            onClick={handleGenerateBrowserToken}
                            disabled={isGeneratingToken}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded transition flex items-center gap-1"
                        >
                            {isGeneratingToken ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                            توليد رمز لهذا المتصفح
                        </button>
                    </div>

                    <textarea 
                        value={newTokenValue}
                        onChange={(e) => setNewTokenValue(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg text-xs font-mono h-24 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                        placeholder="أدخل الرمز يدوياً أو اضغط على 'توليد رمز' لاستخدام هذا الجهاز..."
                        dir="ltr"
                    />
                </div>

                <div className="flex justify-end gap-3">
                    <button 
                        onClick={() => setEditingTokenStudent(null)}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                        تخطي
                    </button>
                    <button 
                        onClick={handleSaveToken}
                        disabled={!newTokenValue.trim() || isSavingToken}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSavingToken ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        حفظ ومتابعة
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

const StatusButton: React.FC<{
  current: string;
  target: string;
  icon: React.FC<any>;
  label: string;
  color: string;
  onClick: () => void;
}> = ({ current, target, icon: Icon, label, color, onClick }) => {
  const isActive = current === target;
  return (
    <button
      onClick={onClick}
      title={label}
      className={`p-1.5 rounded-md transition-all duration-200 ${
        isActive ? `${color} shadow-sm` : 'text-gray-400 hover:text-gray-600'
      }`}
    >
      <Icon className="w-5 h-5" />
    </button>
  );
};

const UsersPlaceholder = () => (
  <svg className="w-16 h-16 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);