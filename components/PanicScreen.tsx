import React, { useState, useEffect } from 'react';
import {
  Table,
  Code2,
  FileText,
  BookOpen,
  Search,
  Share2,
  Folder,
  File,
  Terminal,
  Printer,
  Undo,
  Redo,
  ChevronDown,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  List,
  
  
  
  
  Plus,
  Play,
  
  SlidersHorizontal,
  
} from 'lucide-react';

interface PanicScreenProps {
  onRestore?: () => void;
}

type DisguiseApp = 'sheets' | 'vscode' | 'docs' | 'wiki';

export const PanicScreen: React.FC<PanicScreenProps> = ({ onRestore }) => {
  const [activeApp, setActiveApp] = useState<DisguiseApp>('sheets');
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  // ── Sheets State ──
  const [sheetData, setSheetData] = useState<string[][]>([
    ['Metric / Account', 'Q1 Actual', 'Q2 Actual', 'Q3 Forecast', 'Q4 Target', 'Variance %', 'Status'],
    ['Enterprise Subscriptions', '$142,500', '$168,200', '$195,000', '$220,000', '+16.2%', 'On Track'],
    ['Professional Services', '$38,400', '$42,100', '$45,000', '$48,000', '+7.1%', 'On Track'],
    ['Cloud Infrastructure (AWS)', '($24,800)', '($28,300)', '($31,200)', '($33,000)', '-10.2%', 'Over Budget'],
    ['R&D & Engineering Payroll', '($64,200)', '($68,500)', '($72,000)', '($75,000)', '-5.1%', 'Review Required'],
    ['Sales & Marketing Acquisition', '($32,100)', '($34,800)', '($38,000)', '($40,000)', '+2.4%', 'On Track'],
    ['General & Administrative', '($14,500)', '($15,200)', '($16,000)', '($16,500)', '0.0%', 'Stable'],
    ['Operating Income (EBITDA)', '$45,300', '$63,500', '$82,800', '$103,500', '+30.4%', 'Strong'],
    ['Tax & Contingency Reserves', '($9,500)', '($13,300)', '($17,400)', '($21,700)', '-4.2%', 'Compliant'],
    ['Net Retained Earnings', '$35,800', '$50,200', '$65,400', '$81,800', '+30.3%', 'Optimized'],
  ]);
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number }>({ r: 1, c: 1 });
  const [activeTab, setActiveTab] = useState<'Q3 Model' | 'Headcount' | 'Cash Flow'>('Q3 Model');

  // ── Docs State ──
  const [docContent, setDocContent] = useState<string>(
    `CONFIDENTIAL DRAFT: ENTERPRISE ZERO-TRUST ARCHITECTURE AUDIT\n\n` +
    `Document Owner: Infrastructure Security & Compliance Group\n` +
    `Revision: 4.2.1-prod | Target Compliance: SOC-2 Type II, ISO/IEC 27001:2022\n\n` +
    `1. Executive Overview\n` +
    `The ongoing transition from perimeter-based firewalls to continuous identity verification requires automated policy enforcement at every proxy ingress point. During the Q3 validation review, all external endpoints were analyzed for rate-limiting enforcement, reverse-proxy SSL termination, and certificate rotation mechanisms.\n\n` +
    `2. Key Architectural Deliverables\n` +
    `• Zero-Trust Session Tokens: Cryptographically signed ephemeral tokens expiring within 15-minute sliding windows.\n` +
    `• Network Ingress Hardening: Rate limits set at 100 req/min per verified CIDR block with strict IP reputation checks.\n` +
    `• Microsegmentation: Inter-cluster RPC traffic isolated via mTLS 1.3 encryption with ECDSA certificates.\n\n` +
    `3. Immediate Action Items for Engineering\n` +
    `[x] Finalize database failover latency tests across multi-region clusters.\n` +
    `[ ] Complete automated vulnerability scan before Friday 17:00 EST.\n` +
    `[ ] Review updated GDPR data retention rules with legal counsel.`
  );

  // ── Code Editor State ──
  const [activeFile, setActiveFile] = useState('auth.service.ts');
  const codeFiles: Record<string, string> = {
    'auth.service.ts': `import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RedisClient } from '../cache/redis.provider';

@Injectable()
export class AuthenticationService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly cache: RedisClient,
  ) {}

  /**
   * Validates high-entropy bearer token against active session cache
   */
  async verifySessionToken(token: string): Promise<UserClaims> {
    try {
      const decoded = await this.jwtService.verifyAsync<UserClaims>(token, {
        algorithms: ['ES256', 'EdDSA'],
      });

      const isRevoked = await this.cache.get(\`revoked:\${decoded.sessionId}\`);
      if (isRevoked) {
        throw new UnauthorizedException('Session has been revoked by security policy');
      }

      return decoded;
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired cryptographic token');
    }
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.cache.set(\`revoked:\${sessionId}\`, 'true', 'EX', 86400);
  }
}`,
    'schema.sql': `-- Distributed User Authentication Schema
CREATE TABLE IF NOT EXISTS security_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id VARCHAR(64) NOT NULL,
    action_type VARCHAR(32) NOT NULL,
    ip_address INET NOT NULL,
    user_agent TEXT,
    payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_actor_created ON security_audit_logs (actor_id, created_at DESC);
CREATE INDEX idx_audit_action ON security_audit_logs (action_type);`,
    'package.json': `{
  "name": "enterprise-auth-gateway",
  "version": "3.4.0",
  "private": true,
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "start:prod": "node dist/main.js",
    "test": "jest --config ./test/jest-e2e.json",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\""
  }
}`
  };

  // Mask Document Title and Favicon while Panicked
  useEffect(() => {
    const originalTitle = document.title;
    const titleMap: Record<DisguiseApp, string> = {
      sheets: 'Q3 FY26 Corporate Budget & EBITDA Model - Google Sheets',
      vscode: 'auth.service.ts - enterprise-auth-gateway - Visual Studio Code',
      docs: 'Enterprise Zero-Trust Architecture Audit.docx - Google Docs',
      wiki: 'Cryptographic hash function - Wikipedia',
    };
    document.title = titleMap[activeApp];

    return () => {
      document.title = originalTitle;
    };
  }, [activeApp]);

  // Global Keyboard Shortcuts (Alt+P or Ctrl+Shift+X or Esc) to Restore
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.altKey && e.key.toLowerCase() === 'p') ||
        (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'x')
      ) {
        e.preventDefault();
        onRestore?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onRestore]);

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen overflow-hidden flex flex-col font-sans select-none">
      {/* ── Discrete Stealth Disguise Selector & Top Application Banner ── */}
      <div className="h-8 bg-[#1e293b] text-slate-300 text-[11px] px-3 flex items-center justify-between border-b border-slate-700/80 z-20">
        <div className="flex items-center gap-4">
          <div
            className="flex items-center gap-1.5 font-semibold text-slate-200 cursor-pointer"
            onDoubleClick={onRestore}
            title="Double-click icon to return"
          >
            {activeApp === 'sheets' && <div className="w-3.5 h-3.5 bg-emerald-500 rounded-sm flex items-center justify-center text-[9px] text-white font-bold">X</div>}
            {activeApp === 'vscode' && <div className="w-3.5 h-3.5 bg-blue-500 rounded-sm flex items-center justify-center text-[9px] text-white font-bold">VS</div>}
            {activeApp === 'docs' && <div className="w-3.5 h-3.5 bg-sky-500 rounded-sm flex items-center justify-center text-[9px] text-white font-bold">W</div>}
            {activeApp === 'wiki' && <div className="w-3.5 h-3.5 bg-slate-300 text-slate-800 rounded-sm flex items-center justify-center text-[9px] font-serif font-bold">W</div>}
            <span className="tracking-tight">
              {activeApp === 'sheets' ? 'Sheets — Financial Planning' : activeApp === 'vscode' ? 'Visual Studio Code' : activeApp === 'docs' ? 'Google Docs' : 'Wikipedia'}
            </span>
          </div>

          {/* Preset Disguise Switcher Buttons */}
          <div className="flex items-center bg-slate-800/80 rounded-md p-0.5 border border-slate-700">
            <button
              onClick={() => setActiveApp('sheets')}
              className={`px-2 py-0.5 rounded text-[11px] flex items-center gap-1 transition-all ${
                activeApp === 'sheets' ? 'bg-emerald-600 text-white font-medium shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Table size={12} />
              <span>Spreadsheet</span>
            </button>
            <button
              onClick={() => setActiveApp('vscode')}
              className={`px-2 py-0.5 rounded text-[11px] flex items-center gap-1 transition-all ${
                activeApp === 'vscode' ? 'bg-blue-600 text-white font-medium shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code2 size={12} />
              <span>IDE</span>
            </button>
            <button
              onClick={() => setActiveApp('docs')}
              className={`px-2 py-0.5 rounded text-[11px] flex items-center gap-1 transition-all ${
                activeApp === 'docs' ? 'bg-sky-600 text-white font-medium shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText size={12} />
              <span>Document</span>
            </button>
            <button
              onClick={() => setActiveApp('wiki')}
              className={`px-2 py-0.5 rounded text-[11px] flex items-center gap-1 transition-all ${
                activeApp === 'wiki' ? 'bg-slate-600 text-white font-medium shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen size={12} />
              <span>Reference</span>
            </button>
          </div>
        </div>

        {/* Right Stealth Controls */}
        <div className="flex items-center gap-3 relative">
          <span className="text-[10px] text-slate-400 hidden sm:inline">Autosaved · Cloud Sync Online</span>

          {/* Account Profile Avatar with stealth exit dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowAccountMenu(m => !m)}
              className="w-5 h-5 rounded-full bg-slate-600 hover:bg-slate-500 text-white text-[10px] font-bold flex items-center justify-center transition-colors cursor-pointer"
              title="Workspace Account"
            >
              JD
            </button>

            {showAccountMenu && (
              <div className="absolute right-0 top-7 w-48 bg-white text-slate-800 rounded-lg shadow-xl border border-slate-200 py-1 z-50 text-xs animate-in fade-in slide-in-from-top-1">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="font-semibold text-slate-900">Johnathan Doe</p>
                  <p className="text-[11px] text-slate-500 truncate">j.doe@enterprise.internal</p>
                </div>
                <button
                  onClick={() => setShowAccountMenu(false)}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700"
                >
                  Workspace Preferences
                </button>
                <button
                  onClick={() => setShowAccountMenu(false)}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700"
                >
                  Security Key Management
                </button>
                <div className="border-t border-slate-100 my-1" />
                {onRestore && (
                  <button
                    onClick={() => {
                      setShowAccountMenu(false);
                      onRestore();
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 text-emerald-700 font-medium flex items-center justify-between"
                  >
                    <span>Resume Secure Session</span>
                    <span className="text-[10px] text-slate-400 font-mono">Alt+P</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          APP 1: SPREADSHEET (Google Sheets / Excel Style)
      ─────────────────────────────────────────────────────────────── */}
      {activeApp === 'sheets' && (
        <div className="flex-1 flex flex-col bg-white text-slate-800 overflow-hidden">
          {/* Menu & Toolbar */}
          <div className="border-b border-slate-200 bg-[#f9fbfd] px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-7 h-7 bg-emerald-600 rounded text-white font-bold flex items-center justify-center text-sm cursor-pointer shadow-xs"
                  onDoubleClick={onRestore}
                  title="Double-click to resume"
                >
                  <Table size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-800">Q3 FY26 Corporate Budget & EBITDA Model</span>
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 font-medium">Read-Only</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-600 mt-0.5">
                    <span className="hover:text-slate-900 cursor-pointer">File</span>
                    <span className="hover:text-slate-900 cursor-pointer">Edit</span>
                    <span className="hover:text-slate-900 cursor-pointer">View</span>
                    <span className="hover:text-slate-900 cursor-pointer">Insert</span>
                    <span className="hover:text-slate-900 cursor-pointer">Format</span>
                    <span className="hover:text-slate-900 cursor-pointer">Data</span>
                    <span className="hover:text-slate-900 cursor-pointer">Tools</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onRestore}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-xs transition-colors"
                >
                  <Share2 size={13} />
                  <span>Share</span>
                </button>
              </div>
            </div>

            {/* Formula Bar */}
            <div className="mt-2.5 pt-2 border-t border-slate-200/80 flex items-center gap-2 text-xs">
              <div className="px-2 py-0.5 bg-white border border-slate-300 rounded text-slate-600 font-mono text-[11px] w-14 text-center">
                {String.fromCharCode(65 + selectedCell.c)}{selectedCell.r + 1}
              </div>
              <span className="font-serif italic font-bold text-slate-400">fx</span>
              <input
                type="text"
                value={sheetData[selectedCell.r]?.[selectedCell.c] || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setSheetData(prev => {
                    const next = prev.map(row => [...row]);
                    if (next[selectedCell.r]) {
                      next[selectedCell.r][selectedCell.c] = val;
                    }
                    return next;
                  });
                }}
                className="flex-1 bg-white border border-slate-300 rounded px-2 py-0.5 font-mono text-xs text-slate-800 outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Grid Container */}
          <div className="flex-1 overflow-auto bg-slate-100 p-1">
            <div className="bg-white border border-slate-300 inline-block min-w-full shadow-xs">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-[#f2f4f8] text-slate-500 font-mono text-[11px]">
                    <th className="w-10 border border-slate-300 p-1 text-center font-normal bg-slate-200/70"></th>
                    {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((col, _idx) => (
                      <th key={col} className="border border-slate-300 px-3 py-1 font-semibold text-center min-w-[130px]">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sheetData.map((row, rIdx) => (
                    <tr key={rIdx} className={rIdx === 0 ? 'bg-slate-50 font-bold' : 'hover:bg-slate-50/60'}>
                      <td className="border border-slate-300 text-center font-mono text-[10px] text-slate-400 bg-[#f8f9fc] py-1 select-none">
                        {rIdx + 1}
                      </td>
                      {row.map((cell, cIdx) => {
                        const isSelected = selectedCell.r === rIdx && selectedCell.c === cIdx;
                        const isStatus = cIdx === 6 && rIdx > 0;
                        return (
                          <td
                            key={cIdx}
                            onClick={() => setSelectedCell({ r: rIdx, c: cIdx })}
                            className={`border border-slate-300 px-2.5 py-1 text-slate-800 cursor-cell font-sans ${
                              isSelected ? 'outline-2 outline-emerald-600 bg-emerald-50/30' : ''
                            } ${cIdx > 0 && cIdx < 6 ? 'text-right font-mono' : ''}`}
                          >
                            {isStatus ? (
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                cell === 'On Track' || cell === 'Optimized' || cell === 'Strong' ? 'bg-emerald-100 text-emerald-800' :
                                cell === 'Over Budget' || cell === 'Review Required' ? 'bg-amber-100 text-amber-800' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                                {cell}
                              </span>
                            ) : (
                              cell
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {/* Empty rows to complete appearance */}
                  {Array.from({ length: 12 }).map((_, idx) => (
                    <tr key={`empty-${idx}`} className="h-6">
                      <td className="border border-slate-300 text-center font-mono text-[10px] text-slate-400 bg-[#f8f9fc] select-none">
                        {sheetData.length + idx + 1}
                      </td>
                      {Array.from({ length: 7 }).map((_, cIdx) => (
                        <td key={cIdx} className="border border-slate-300 px-2.5 py-1" />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Tabs & Status */}
          <div className="h-8 border-t border-slate-200 bg-[#f8f9fa] flex items-center justify-between px-3 text-xs text-slate-600">
            <div className="flex items-center gap-1">
              <button className="p-1 hover:bg-slate-200 rounded text-slate-500"><Plus size={14} /></button>
              {(['Q3 Model', 'Headcount', 'Cash Flow'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1 rounded-t text-xs font-medium transition-colors ${
                    activeTab === tab ? 'bg-white border-t-2 border-t-emerald-600 text-emerald-700 shadow-xs' : 'hover:bg-slate-200/70 text-slate-600'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="text-[11px] font-mono text-slate-500">
              Average: $42,390 · Count: 10 · Sum: $423,900
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          APP 2: CODE EDITOR (VS Code Dark Theme Style)
      ─────────────────────────────────────────────────────────────── */}
      {activeApp === 'vscode' && (
        <div className="flex-1 flex bg-[#1e1e1e] text-slate-300 font-mono text-xs overflow-hidden">
          {/* Far Left Activity Bar */}
          <div className="w-12 bg-[#333333] flex flex-col items-center py-3 gap-5 text-slate-400 border-r border-[#252526]">
            <button className="text-white hover:text-white" title="Explorer"><File size={20} /></button>
            <button className="hover:text-white" title="Search"><Search size={20} /></button>
            <button className="hover:text-white" title="Source Control"><Code2 size={20} /></button>
            <button className="hover:text-white" title="Run and Debug"><Play size={20} /></button>
            <div className="mt-auto flex flex-col gap-4">
              <button
                onClick={onRestore}
                className="hover:text-white"
                title="Settings"
              >
                <SlidersHorizontal size={20} />
              </button>
            </div>
          </div>

          {/* Project Explorer Sidebar */}
          <div className="w-56 bg-[#252526] border-r border-[#1e1e1e] flex flex-col">
            <div className="px-3 py-2 uppercase text-[10px] font-bold tracking-wider text-slate-400 flex items-center justify-between">
              <span>EXPLORER</span>
              <span className="text-[9px] lowercase bg-[#333] px-1 rounded text-slate-300">git:main</span>
            </div>
            <div className="px-2 py-1 text-slate-400 flex items-center gap-1 font-semibold text-[11px]">
              <ChevronDown size={14} />
              <span>ENTERPRISE-AUTH-GATEWAY</span>
            </div>
            <div className="pl-4 pr-2 space-y-0.5 text-xs text-slate-300">
              <div className="flex items-center gap-1.5 py-0.5 text-slate-400">
                <Folder size={13} className="text-amber-400" />
                <span>src</span>
              </div>
              <div className="pl-3 space-y-0.5">
                {Object.keys(codeFiles).map(fileName => (
                  <div
                    key={fileName}
                    onClick={() => setActiveFile(fileName)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer ${
                      activeFile === fileName ? 'bg-[#37373d] text-white font-medium' : 'hover:bg-[#2a2d2e] text-slate-400'
                    }`}
                  >
                    <File size={13} className={fileName.endsWith('.ts') ? 'text-blue-400' : 'text-emerald-400'} />
                    <span>{fileName}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Editor Section */}
          <div className="flex-1 flex flex-col bg-[#1e1e1e] overflow-hidden">
            {/* Tabs */}
            <div className="h-9 bg-[#252526] flex items-center overflow-x-auto border-b border-[#1e1e1e]">
              {Object.keys(codeFiles).map(fileName => (
                <button
                  key={fileName}
                  onClick={() => setActiveFile(fileName)}
                  className={`h-full px-4 flex items-center gap-2 border-r border-[#1e1e1e] text-xs ${
                    activeFile === fileName ? 'bg-[#1e1e1e] text-white border-t-2 border-t-blue-500' : 'bg-[#2d2d2d] text-slate-400 hover:bg-[#252526]'
                  }`}
                >
                  <File size={13} className={fileName.endsWith('.ts') ? 'text-blue-400' : 'text-emerald-400'} />
                  <span>{fileName}</span>
                </button>
              ))}
            </div>

            {/* Breadcrumb */}
            <div className="h-6 bg-[#1e1e1e] px-4 flex items-center gap-1 text-[11px] text-slate-500 border-b border-[#252526]">
              <span>src</span>
              <span>›</span>
              <span>controllers</span>
              <span>›</span>
              <span className="text-slate-300">{activeFile}</span>
            </div>

            {/* Code Body with Line Numbers */}
            <div className="flex-1 flex overflow-auto p-2">
              <div className="w-10 text-right pr-3 select-none text-slate-600 leading-relaxed font-mono text-[11px]">
                {Array.from({ length: 32 }).map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
              <textarea
                value={codeFiles[activeFile] || ''}
                readOnly
                className="flex-1 bg-transparent text-slate-200 outline-none resize-none leading-relaxed font-mono text-[12px] selection:bg-blue-900/60"
                rows={32}
              />
            </div>

            {/* Bottom Integrated Terminal */}
            <div className="h-28 bg-[#181818] border-t border-[#2d2d2d] p-3 flex flex-col">
              <div className="flex items-center justify-between text-[10px] text-slate-400 pb-1 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="text-white font-bold flex items-center gap-1"><Terminal size={12} /> TERMINAL</span>
                  <span>OUTPUT</span>
                  <span>DEBUG CONSOLE</span>
                </div>
                <span>bash - 80x24</span>
              </div>
              <div className="flex-1 overflow-auto text-[11px] text-emerald-400 font-mono mt-2 leading-tight">
                <p className="text-slate-400">dev@cloud-node:~/services/auth$ pnpm test --passWithNoTests</p>
                <p className="text-slate-300 mt-1">PASS src/auth.service.spec.ts (6 tests, 120ms)</p>
                <p className="text-emerald-400">✓ Session verification returns valid JWT claims</p>
                <p className="text-emerald-400">✓ Revocation blacklist rejects compromised bearer credentials</p>
                <p className="text-slate-500 mt-1">Watching for file changes in ./src...</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          APP 3: GOOGLE DOCS (Word / Corporate Brief Style)
      ─────────────────────────────────────────────────────────────── */}
      {activeApp === 'docs' && (
        <div className="flex-1 flex flex-col bg-[#f9fbfd] text-slate-800 overflow-hidden">
          {/* Docs Header & Toolbar */}
          <div className="border-b border-slate-200 bg-white px-5 py-2 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-7 h-7 bg-sky-600 rounded text-white font-bold flex items-center justify-center text-sm shadow-xs cursor-pointer"
                  onDoubleClick={onRestore}
                  title="Double-click icon to resume"
                >
                  <FileText size={16} />
                </div>
                <div>
                  <h1 className="font-semibold text-sm text-slate-900">Enterprise Zero-Trust Architecture Audit.docx</h1>
                  <div className="flex items-center gap-3 text-xs text-slate-600 mt-0.5">
                    <span className="hover:text-slate-900 cursor-pointer">File</span>
                    <span className="hover:text-slate-900 cursor-pointer">Edit</span>
                    <span className="hover:text-slate-900 cursor-pointer">View</span>
                    <span className="hover:text-slate-900 cursor-pointer">Insert</span>
                    <span className="hover:text-slate-900 cursor-pointer">Format</span>
                    <span className="hover:text-slate-900 cursor-pointer">Tools</span>
                    <span className="text-[11px] text-slate-400">All changes saved to Drive</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onRestore}
                  className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white px-3.5 py-1.5 rounded-full text-xs font-medium shadow-xs transition-colors"
                >
                  <Share2 size={13} />
                  <span>Share</span>
                </button>
              </div>
            </div>

            {/* Docs Styling Ribbon */}
            <div className="mt-2 pt-2 border-t border-slate-200 flex items-center gap-1 text-slate-600 text-xs flex-wrap">
              <button className="p-1 hover:bg-slate-100 rounded" title="Undo"><Undo size={14} /></button>
              <button className="p-1 hover:bg-slate-100 rounded" title="Redo"><Redo size={14} /></button>
              <button className="p-1 hover:bg-slate-100 rounded" title="Print"><Printer size={14} /></button>
              <div className="h-4 w-px bg-slate-300 mx-1" />
              <div className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded text-xs">100%</div>
              <div className="h-4 w-px bg-slate-300 mx-1" />
              <div className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded text-xs font-sans">Arial</div>
              <div className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded text-xs font-mono">11</div>
              <div className="h-4 w-px bg-slate-300 mx-1" />
              <button className="p-1 hover:bg-slate-100 rounded font-bold" title="Bold"><Bold size={14} /></button>
              <button className="p-1 hover:bg-slate-100 rounded italic" title="Italic"><Italic size={14} /></button>
              <button className="p-1 hover:bg-slate-100 rounded underline" title="Underline"><Underline size={14} /></button>
              <div className="h-4 w-px bg-slate-300 mx-1" />
              <button className="p-1 hover:bg-slate-100 rounded" title="Align Left"><AlignLeft size={14} /></button>
              <button className="p-1 hover:bg-slate-100 rounded" title="Bullet List"><List size={14} /></button>
            </div>
          </div>

          {/* Paper Canvas */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 flex justify-center bg-[#eef2f6]">
            <div className="w-full max-w-[816px] min-h-[1056px] bg-white shadow-md border border-slate-200 rounded-sm p-12 md:p-16 flex flex-col">
              <textarea
                value={docContent}
                onChange={(e) => setDocContent(e.target.value)}
                className="flex-1 w-full border-none outline-none resize-none font-serif text-[13px] md:text-[14px] leading-relaxed text-slate-800 selection:bg-sky-100"
                rows={26}
              />
              <div className="pt-6 mt-auto border-t border-slate-200 flex items-center justify-between text-xs text-slate-400">
                <span>Page 1 of 1</span>
                <span>{docContent.split(/\s+/).filter(Boolean).length} words · {docContent.length} characters</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          APP 4: WIKIPEDIA (Technical Article Reference)
      ─────────────────────────────────────────────────────────────── */}
      {activeApp === 'wiki' && (
        <div className="flex-1 flex flex-col bg-white text-slate-900 overflow-y-auto font-serif">
          {/* Wiki Top Navbar */}
          <div className="border-b border-slate-300 px-6 py-3 flex items-center justify-between bg-white font-sans text-xs">
            <div className="flex items-center gap-3">
              <span className="font-serif text-xl font-bold tracking-tight text-slate-900 cursor-pointer" onDoubleClick={onRestore}>
                WIKIPEDIA
              </span>
              <span className="text-[11px] text-slate-500">The Free Encyclopedia</span>
            </div>
            <div className="w-64 max-w-sm relative">
              <input
                type="text"
                placeholder="Search Wikipedia"
                defaultValue="Cryptographic hash function"
                className="w-full px-3 py-1 text-xs border border-slate-300 rounded bg-slate-50 outline-none focus:border-slate-500"
              />
              <Search size={13} className="absolute right-2.5 top-2 text-slate-400" />
            </div>
          </div>

          {/* Article Container */}
          <div className="max-w-4xl mx-auto w-full px-6 py-8">
            <h1 className="text-3xl font-serif text-slate-900 pb-2 border-b border-slate-300">
              Cryptographic hash function
            </h1>
            <p className="text-xs text-slate-500 font-sans mt-1">From Wikipedia, the free encyclopedia</p>

            <div className="mt-4 grid md:grid-cols-3 gap-6 font-sans text-[13px] leading-relaxed">
              <div className="md:col-span-2 space-y-4 text-slate-800">
                <p>
                  A <strong>cryptographic hash function (CHF)</strong> is a mathematical algorithm that maps data of arbitrary size (often called the "message") to a bit array of a fixed size (the "hash value", "hash", or "message digest"). It is a one-way function, meaning that it is computationally infeasible to invert or re-create the original input data from its hash value alone.
                </p>
                <p>
                  The ideal cryptographic hash function has the following main properties:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>It is <strong>deterministic</strong>: the same message always yields the same hash.</li>
                  <li>It is quick to compute the hash value for any given message.</li>
                  <li>It is infeasible to generate a message that yields a given hash value (pre-image resistance).</li>
                  <li>It is infeasible to modify a message without changing the hash.</li>
                  <li>It is infeasible to find two different messages with the same hash (collision resistance).</li>
                </ul>

                <h2 className="text-xl font-serif text-slate-900 pt-4 border-b border-slate-200">
                  Applications in Distributed Network Protocols
                </h2>
                <p>
                  In peer-to-peer communication networks and distributed cryptographic ledgers, cryptographic hashes serve as content-addressable identifiers, message integrity verifiers, and proof-of-work puzzles. Algorithms such as SHA-256, SHA-3, and BLAKE3 are widely utilized in standard transport-layer security handshakes.
                </p>
              </div>

              {/* Wikipedia Infobox */}
              <div className="border border-slate-300 rounded bg-[#f8f9fa] p-4 text-xs font-sans space-y-3 h-fit">
                <div className="font-bold text-center border-b border-slate-200 pb-2 text-slate-900">
                  Cryptographic Hash Function
                </div>
                <div className="space-y-1 text-slate-700">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="font-semibold text-slate-600">Digest sizes:</span>
                    <span>128, 160, 256, 512 bits</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="font-semibold text-slate-600">Standard suites:</span>
                    <span>SHA-2, SHA-3, BLAKE3</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="font-semibold text-slate-600">Security model:</span>
                    <span>Random Oracle</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="font-semibold text-slate-600">Collision risk:</span>
                    <span>O(2<sup>n/2</sup>)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
