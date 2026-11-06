
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, Info, Clock, User, CheckCircle2, AlertTriangle } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

const PrivacyPolicyModal: React.FC<Props> = ({ isOpen, onClose }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-hidden">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl flex flex-col max-h-[85vh] shadow-2xl shadow-indigo-500/10"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
                                    <ShieldCheck size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-100 leading-tight">개인정보 수집 및 이용 동의서</h3>
                                    <p className="text-[10px] text-slate-500 font-medium">Privacy Policy Agreement</p>
                                </div>
                            </div>
                            <button 
                                onClick={onClose}
                                className="p-2 text-slate-500 hover:text-white transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-300 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                            <section className="space-y-2">
                                <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-widest">
                                    <Info size={14} /> 1. 법적 근거
                                </div>
                                <p className="text-xs leading-relaxed text-slate-400 bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                                    본 동의서는 [개인정보 보호법] 제15조 및 제17조 등 관련 법 조항을 준수하며, 서비스 이용에 필요한 최소한의 개인정보를 수집하는 데 목적이 있습니다.
                                </p>
                            </section>

                            <section className="space-y-3">
                                <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-widest">
                                    <User size={14} /> 2. 개인정보 수집 및 이용 항목
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                    <div className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800 space-y-2">
                                        <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-2">
                                            <span className="text-xs font-bold text-slate-200">수집 항목</span>
                                            <span className="text-[10px] text-indigo-400 font-bold">필수</span>
                                        </div>
                                        <ul className="text-xs space-y-1.5 text-slate-400">
                                            <li className="flex items-center gap-2"><CheckCircle2 size={12} className="text-emerald-500"/> 성명 (이름)</li>
                                            <li className="flex items-center gap-2"><CheckCircle2 size={12} className="text-emerald-500"/> 이메일 주소 (아이디)</li>
                                            <li className="flex items-center gap-2"><CheckCircle2 size={12} className="text-emerald-500"/> 생년월일 (본인 확인용)</li>
                                            <li className="flex items-center gap-2"><CheckCircle2 size={12} className="text-emerald-500"/> 전화번호 (계정 복구 및 알림)</li>
                                        </ul>
                                    </div>

                                    <div className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800 space-y-2">
                                        <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-2">
                                            <span className="text-xs font-bold text-slate-200">이용 목적</span>
                                        </div>
                                        <ul className="text-xs space-y-1.5 text-slate-400">
                                            <li className="flex items-center gap-2">• 계정 생성 및 본인 식별</li>
                                            <li className="flex items-center gap-2">• 아이디 찾기 및 비밀번호 재설정 기능 제공</li>
                                            <li className="flex items-center gap-2">• 게임 데이터의 클라우드 백업 및 기기간 동기화</li>
                                            <li className="flex items-center gap-2">• 서비스 부정 이용 방지 및 보안 환경 고도화</li>
                                        </ul>
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-2">
                                <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-widest">
                                    <Clock size={14} /> 3. 보관 및 이용 기간
                                </div>
                                <div className="p-4 bg-amber-500/5 rounded-2xl border border-amber-500/20">
                                    <p className="text-xs text-amber-200/70 leading-relaxed font-medium">
                                        수집된 개인정보는 사용자가 <span className="text-amber-500 font-bold underline underline-offset-4">회원을 탈퇴하거나 서비스를 해지할 때까지</span> 보관 및 이용됩니다. 탈퇴 시 수집된 모든 정보는 [개인정보 보호법] 제21조에 따라 지체 없이 파기됩니다.
                                    </p>
                                </div>
                            </section>

                            <section className="space-y-2 pb-4">
                                <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-widest">
                                    <AlertTriangle size={14} /> 4. 동의 거부 권리 및 불이익 안내
                                </div>
                                <p className="text-xs leading-relaxed text-slate-400 bg-red-500/5 p-4 rounded-2xl border border-red-500/20">
                                    귀하는 본 개인정보 수집 및 이용에 대한 동의를 거부할 권리가 있습니다. 단, 동의 거부 시 <span className="text-red-400 font-bold">회원가입, 클라우드 백업 서비스, 아이디/비밀번호 찾기 기능</span>의 이용이 제한됩니다.
                                </p>
                            </section>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-slate-800 bg-slate-950/30 shrink-0">
                            <button
                                onClick={onClose}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-900/20 active:scale-[0.98]"
                            >
                                확인하였습니다
                            </button>
                            <p className="text-[9px] text-slate-600 text-center mt-4">
                                본 동의서는 공정거래위원회 표준 약관 및 개인정보보호 가이드를 준수합니다.
                            </p>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default PrivacyPolicyModal;
