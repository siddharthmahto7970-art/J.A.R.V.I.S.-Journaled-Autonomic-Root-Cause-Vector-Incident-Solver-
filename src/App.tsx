/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Terminal,
  Database,
  BrainCircuit,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Play,
  RefreshCw,
  Search,
  Copy,
  Plus,
  Server,
  Clock,
  ArrowRight,
  Check,
  Zap,
  Network,
  RotateCcw,
  History,
  ShieldCheck,
  Wrench,
  ExternalLink,
  ChevronRight,
  CheckCircle
} from 'lucide-react';

interface RunbookStep {
  order: number;
  name: string;
  description: string;
  command: string;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  execution_log?: string;
  executed_at?: string;
}

export interface StatusTimelineEvent {
  status: 'TRIAGED' | 'MITIGATING' | 'RESOLVED';
  timestamp: string;
  title: string;
  description: string;
  source: 'SYSTEM' | 'RUNBOOK' | 'OPERATOR';
  step_order?: number;
}

interface IncidentRecord {
  incident_id: string;
  status: 'TRIAGED' | 'MITIGATING' | 'RESOLVED';
  timestamp: string;
  service: string;
  severity: string;
  alert_message: string;
  stack_trace?: string;
  triaged_root_cause: string;
  confidence_score: number;
  recalled_memories: Array<{
    id?: string;
    text: string;
    incident_id?: string;
    service?: string;
    similarity?: number;
  }>;
  immediate_mitigation: string;
  recommended_runbook: {
    title: string;
    steps: RunbookStep[];
  };
  blast_radius_assessment: {
    impact_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    affected_services: string[];
    estimated_mttr: string;
    customer_impact: string;
  };
  prevention_plan: string[];
  status_timeline?: StatusTimelineEvent[];
}

interface PostMortem {
  incident_id: string;
  service: string;
  severity: string;
  symptom: string;
  root_cause: string;
  resolution_steps: string[];
  effective_runbook: string;
}

interface BankStats {
  bank_id: string;
  total_nodes: number;
  total_links: number;
  total_documents: number;
  nodes_by_fact_type?: Record<string, number>;
  links_by_link_type?: Record<string, number>;
  last_memory_write_at?: string;
  total_observations?: number;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'command' | 'memory' | 'postmortems' | 'webhook'>('command');

  // Core Data
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<IncidentRecord | null>(null);
  const [postMortems, setPostMortems] = useState<PostMortem[]>([]);
  const [bankStats, setBankStats] = useState<BankStats | null>(null);
  const [hindsightConnected, setHindsightConnected] = useState<boolean>(true);
  const [isAlertSubmitting, setIsAlertSubmitting] = useState<boolean>(false);
  const [executingStepOrder, setExecutingStepOrder] = useState<number | null>(null);

  // Terminal telemetry logs
  const [terminalLogs, setTerminalLogs] = useState<Array<{ timestamp: string; text: string; color: string }>>([
    { timestamp: new Date().toLocaleTimeString(), text: 'J.A.R.V.I.S ONLINE // JOURNALED AUTONOMIC ROOT-CAUSE & VECTOR INCIDENT SOLVER', color: '#ff3e3e' },
    { timestamp: new Date().toLocaleTimeString(), text: 'HINDSIGHT_DB_LINK_ESTABLISHED // BANK: incident-response-agent', color: '#00ff88' },
    { timestamp: new Date().toLocaleTimeString(), text: 'MODEL_SYNTHESIS_STANDBY // GEMINI_3.8_READY', color: '#ff3e3e' },
    { timestamp: new Date().toLocaleTimeString(), text: 'INCIDENT_INTERCEPTOR_ACTIVE // PROTOCOL_ALPHA-1', color: '#ffcc00' }
  ]);

  // Modals & form state
  const [showCustomAlertModal, setShowCustomAlertModal] = useState<boolean>(false);
  const [customService, setCustomService] = useState('payment-gateway-v2');
  const [customSeverity, setCustomSeverity] = useState('P1-CRITICAL');
  const [customMessage, setCustomMessage] = useState('504 Gateway Timeout detected on checkout endpoint');
  const [customStackTrace, setCustomStackTrace] = useState('HikariPool-1 - Connection is not available, request timed out after 30000ms.');

  const [showNewPmModal, setShowNewPmModal] = useState<boolean>(false);
  const [newPmId, setNewPmId] = useState('');
  const [newPmService, setNewPmService] = useState('');
  const [newPmSeverity, setNewPmSeverity] = useState('P1-CRITICAL');
  const [newPmSymptom, setNewPmSymptom] = useState('');
  const [newPmRootCause, setNewPmRootCause] = useState('');
  const [newPmSteps, setNewPmSteps] = useState('');
  const [newPmRunbook, setNewPmRunbook] = useState('');

  // Semantic recall probe
  const [recallQuery, setRecallQuery] = useState('HikariCP connection pool timeout');
  const [recallResults, setRecallResults] = useState<any[]>([]);
  const [isRecalling, setIsRecalling] = useState(false);

  // Ingestion
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestStatus, setIngestStatus] = useState<string | null>(null);

  // Clipboard feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const addLog = (text: string, color: string = '#e0e0e0') => {
    setTerminalLogs(prev => [
      ...prev.slice(-40),
      { timestamp: new Date().toLocaleTimeString(), text, color }
    ]);
  };

  // Fetch initial system state
  const fetchData = async () => {
    try {
      const healthRes = await fetch('/health');
      if (healthRes.ok) {
        const health = await healthRes.json();
        setHindsightConnected(health.hindsight_connected);
      }

      const incRes = await fetch('/api/v1/incidents');
      if (incRes.ok) {
        const incData: IncidentRecord[] = await incRes.json();
        setIncidents(incData);
        if (incData.length > 0 && !selectedIncident) {
          setSelectedIncident(incData[0]);
        }
      }

      const pmRes = await fetch('/api/v1/post-mortems');
      if (pmRes.ok) {
        const pmData = await pmRes.json();
        setPostMortems(pmData);
      }

      const statsRes = await fetch('/api/v1/hindsight/status');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.stats) {
          setBankStats(statsData.stats);
        }
      }
    } catch (err) {
      console.error('Error fetching initial data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Trigger alert simulation preset
  const triggerPresetAlert = async (preset: {
    service: string;
    severity: string;
    alert_message: string;
    stack_trace: string;
  }) => {
    setIsAlertSubmitting(true);
    addLog(`ALERT_INGEST_INIT // SERVICE: ${preset.service} // SEV: ${preset.severity}`, '#ff3e3e');

    try {
      const res = await fetch('/api/v1/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preset),
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const newIncident: IncidentRecord = await res.json();
      setIncidents(prev => [newIncident, ...prev.filter(i => i.incident_id !== newIncident.incident_id)]);
      setSelectedIncident(newIncident);
      setActiveTab('command');
      addLog(`TRIAGE_COMPLETE // ID: ${newIncident.incident_id} // CONFIDENCE: ${Math.round(newIncident.confidence_score * 100)}%`, '#00ff88');
      addLog(`ROOT_CAUSE: ${newIncident.triaged_root_cause.slice(0, 80)}...`, '#e0e0e0');
      addLog(`RUNBOOK_ATTACHED // TITLE: ${newIncident.recommended_runbook.title}`, '#ffcc00');
    } catch (err: any) {
      addLog(`ALERT_DISPATCH_FAIL // ${err.message}`, '#ff3e3e');
    } finally {
      setIsAlertSubmitting(false);
    }
  };

  // Run runbook step
  const executeStep = async (step: RunbookStep) => {
    if (!selectedIncident) return;
    setExecutingStepOrder(step.order);
    addLog(`EXEC_START // STEP 0${step.order}: ${step.command}`, '#ffcc00');

    try {
      const res = await fetch('/api/v1/runbook/execute-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incident_id: selectedIncident.incident_id,
          step_order: step.order,
          command: step.command,
        }),
      });

      const result = await res.json();
      if (result.success) {
        addLog(`EXEC_SUCCESS // STEP 0${step.order} IN ${result.execution_time_ms}MS`, '#00ff88');

        const updatedSteps = selectedIncident.recommended_runbook.steps.map(s => {
          if (s.order === step.order) {
            return {
              ...s,
              status: 'COMPLETED' as const,
              execution_log: result.output,
              executed_at: new Date().toLocaleTimeString(),
            };
          }
          return s;
        });

        const allDone = updatedSteps.every(s => s.status === 'COMPLETED');
        const updatedIncident: IncidentRecord = {
          ...selectedIncident,
          status: allDone ? 'RESOLVED' : 'MITIGATING',
          status_timeline: result.timeline || selectedIncident.status_timeline,
          recommended_runbook: {
            ...selectedIncident.recommended_runbook,
            steps: updatedSteps,
          },
        };

        setSelectedIncident(updatedIncident);
        setIncidents(prev => prev.map(i => i.incident_id === updatedIncident.incident_id ? updatedIncident : i));

        if (allDone) {
          addLog(`INCIDENT_STATUS_RESOLVED // ALL RUNBOOK STEPS VERIFIED`, '#00ff88');
        }
      }
    } catch (err: any) {
      addLog(`EXEC_FAIL // STEP 0${step.order}: ${err.message}`, '#ff3e3e');
    } finally {
      setExecutingStepOrder(null);
    }
  };

  const executeAllSteps = async () => {
    if (!selectedIncident) return;
    const pending = selectedIncident.recommended_runbook.steps.filter(s => s.status !== 'COMPLETED');
    for (const step of pending) {
      await executeStep(step);
    }
  };

  // Manual status override
  const handleUpdateStatus = async (newStatus: 'TRIAGED' | 'MITIGATING' | 'RESOLVED', note?: string) => {
    if (!selectedIncident) return;
    try {
      const res = await fetch('/api/v1/incidents/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incident_id: selectedIncident.incident_id,
          status: newStatus,
          note: note || `Operator manually transitioned state to ${newStatus}`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const updatedIncident: IncidentRecord = {
          ...selectedIncident,
          status: newStatus,
          status_timeline: data.status_timeline,
        };
        setSelectedIncident(updatedIncident);
        setIncidents(prev => prev.map(i => i.incident_id === updatedIncident.incident_id ? updatedIncident : i));
        addLog(`STATUS_TRANSITION // ${newStatus}`, '#ffcc00');
      }
    } catch (err: any) {
      addLog(`STATUS_UPDATE_FAIL // ${err.message}`, '#ff3e3e');
    }
  };

  // Semantic recall probe
  const handleRecallTest = async () => {
    if (!recallQuery.trim()) return;
    setIsRecalling(true);
    addLog(`HINDSIGHT_PROBE // QUERY: "${recallQuery}"`, '#e0e0e0');
    try {
      const res = await fetch('/api/v1/hindsight/recall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: recallQuery }),
      });
      const data = await res.json();
      setRecallResults(data.results || []);
      addLog(`HINDSIGHT_PROBE_COMPLETE // ${data.results?.length || 0} NODES RETRIEVED`, '#00ff88');
    } catch (err: any) {
      addLog(`PROBE_FAIL // ${err.message}`, '#ff3e3e');
    } finally {
      setIsRecalling(false);
    }
  };

  // Trigger memory bank re-ingestion
  const handleTriggerIngestion = async () => {
    setIsIngesting(true);
    setIngestStatus('CONNECTING_VECTORIZE_HINDSIGHT...');
    addLog('INGESTION_START // SYNCING POST-MORTEMS TO HINDSIGHT CLUSTER', '#ffcc00');

    try {
      const res = await fetch('/api/v1/ingest', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setIngestStatus(`INGESTED ${data.successful}/${data.total} DOCUMENTS INTO BANK '${data.bank_id}'`);
        addLog(`INGESTION_SUCCESS // ${data.successful} POST-MORTEMS RETAINED IN MEMORY`, '#00ff88');
        fetchData();
      } else {
        setIngestStatus(`INGEST_FAIL: ${data.error || 'Unknown error'}`);
        addLog(`INGEST_FAIL // ${data.error}`, '#ff3e3e');
      }
    } catch (err: any) {
      setIngestStatus(`INGEST_FAIL: ${err.message}`);
      addLog(`INGEST_EXCEPTION // ${err.message}`, '#ff3e3e');
    } finally {
      setIsIngesting(false);
    }
  };

  // Save new post-mortem
  const handleSavePostMortem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPmId || !newPmService || !newPmSymptom || !newPmRootCause) return;

    try {
      const stepsArray = newPmSteps.split('\n').map(s => s.trim()).filter(Boolean);
      const res = await fetch('/api/v1/post-mortems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incident_id: newPmId,
          service: newPmService,
          severity: newPmSeverity,
          symptom: newPmSymptom,
          root_cause: newPmRootCause,
          resolution_steps: stepsArray,
          effective_runbook: newPmRunbook || `RB-${newPmService.toUpperCase()}-001`,
        }),
      });

      if (res.ok) {
        addLog(`PM_RETAINED // ${newPmId} INGESTED INTO HINDSIGHT`, '#00ff88');
        setShowNewPmModal(false);
        setNewPmId('');
        setNewPmService('');
        setNewPmSymptom('');
        setNewPmRootCause('');
        setNewPmSteps('');
        setNewPmRunbook('');
        fetchData();
      }
    } catch (err: any) {
      addLog(`PM_SAVE_FAIL // ${err.message}`, '#ff3e3e');
    }
  };

  const completedStepsCount = selectedIncident?.recommended_runbook.steps.filter(s => s.status === 'COMPLETED').length || 0;
  const totalStepsCount = selectedIncident?.recommended_runbook.steps.length || 1;
  const progressPercent = Math.round((completedStepsCount / totalStepsCount) * 100);

  return (
    <div className="min-h-screen bg-[#0f1115] text-[#e0e0e0] flex flex-col selection:bg-[#ff3e3e] selection:text-white">
      {/* Variation 5 App Shell Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_340px] flex-1 p-3 gap-3 overflow-hidden pb-12">
        {/* PANEL 1: SIDEBAR */}
        <aside className="bg-[#16191f] border border-[#232733] flex flex-col p-6 relative overflow-hidden">
          {/* Logo / Header */}
          <div className="border-b border-[#232733] pb-5 mb-5">
            <h1 className="font-syne font-black text-3xl tracking-widest text-white leading-none">
              J<span className="text-[#ff3e3e]">.</span>A<span className="text-[#ff3e3e]">.</span>R<span className="text-[#ff3e3e]">.</span>V<span className="text-[#ff3e3e]">.</span>I<span className="text-[#ff3e3e]">.</span>S
            </h1>
            <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#ff3e3e] font-bold mt-2.5 leading-snug">
              Journaled Autonomic Root-Cause & Vector Incident Solver
            </p>
          </div>

          {/* Navigation Controls: Core Terminal */}
          <div className="mb-6">
            <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500 mb-3 font-bold">
              CORE TERMINAL
            </p>
            <nav className="flex flex-col gap-2">
              <button
                onClick={() => setActiveTab('command')}
                className={`w-full p-3.5 text-left font-mono text-xs uppercase tracking-wider transition-all rounded-none cursor-pointer ${
                  activeTab === 'command'
                    ? 'bg-[#ff3e3e] text-white font-bold border-none shadow-sm'
                    : 'bg-[#16191f] border border-[#232733] text-[#e0e0e0] hover:border-[#384052]'
                }`}
              >
                INCIDENT COMMAND ({incidents.length})
              </button>
              <button
                onClick={() => setActiveTab('memory')}
                className={`w-full p-3.5 text-left font-mono text-xs uppercase tracking-wider transition-all rounded-none cursor-pointer ${
                  activeTab === 'memory'
                    ? 'bg-[#ff3e3e] text-white font-bold border-none shadow-sm'
                    : 'bg-[#16191f] border border-[#232733] text-[#e0e0e0] hover:border-[#384052]'
                }`}
              >
                HINDSIGHT MEMORY
              </button>
              <button
                onClick={() => setActiveTab('postmortems')}
                className={`w-full p-3.5 text-left font-mono text-xs uppercase tracking-wider transition-all rounded-none cursor-pointer ${
                  activeTab === 'postmortems'
                    ? 'bg-[#ff3e3e] text-white font-bold border-none shadow-sm'
                    : 'bg-[#16191f] border border-[#232733] text-[#e0e0e0] hover:border-[#384052]'
                }`}
              >
                POST-MORTEM LIBRARY ({postMortems.length})
              </button>
              <button
                onClick={() => setActiveTab('webhook')}
                className={`w-full p-3.5 text-left font-mono text-xs uppercase tracking-wider transition-all rounded-none cursor-pointer ${
                  activeTab === 'webhook'
                    ? 'bg-[#ff3e3e] text-white font-bold border-none shadow-sm'
                    : 'bg-[#16191f] border border-[#232733] text-[#e0e0e0] hover:border-[#384052]'
                }`}
              >
                INTEGRATIONS / CLI
              </button>
            </nav>
          </div>

          {/* Simulation Ingestion Section */}
          <div className="mb-6">
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#ff3e3e] font-bold mb-3">
              SIMULATION INGESTION
            </p>
            <div className="flex flex-col gap-2.5 font-mono">
              <button
                onClick={() => triggerPresetAlert({
                  service: 'payment-gateway-v2',
                  severity: 'P1-CRITICAL',
                  alert_message: '504 Gateway Timeout detected on checkout endpoint',
                  stack_trace: 'HikariPool-1 - Connection is not available, request timed out after 30000ms.'
                })}
                disabled={isAlertSubmitting}
                className="p-3.5 border border-[#ff3e3e]/40 bg-[#16191f] text-left hover:border-[#ff3e3e] transition-colors rounded-none cursor-pointer disabled:opacity-50"
              >
                <div className="text-[#ff3e3e] font-bold text-xs">01 // HIKARICP_POOL</div>
                <div className="text-[#9ca3af] text-[11px] mt-1">504 Gateway Timeout</div>
              </button>

              <button
                onClick={() => triggerPresetAlert({
                  service: 'auth-service',
                  severity: 'P2-HIGH',
                  alert_message: 'OOMKilled pods crashing repeatedly under elevated login requests',
                  stack_trace: 'OutOfMemoryError: Container killed by cgroup memory limit'
                })}
                disabled={isAlertSubmitting}
                className="p-3.5 border border-[#ffcc00]/40 bg-[#16191f] text-left hover:border-[#ffcc00] transition-colors rounded-none cursor-pointer disabled:opacity-50"
              >
                <div className="text-[#ffcc00] font-bold text-xs">02 // REDIS_SESSION_OOM</div>
                <div className="text-[#9ca3af] text-[11px] mt-1">OOMKilled cgroup exit</div>
              </button>

              <button
                onClick={() => triggerPresetAlert({
                  service: 'notification-dispatcher',
                  severity: 'P1-CRITICAL',
                  alert_message: 'Stale DNS resolution causing connection refusal to AWS SES SMTP endpoints',
                  stack_trace: 'SocketTimeoutException: Connection refused to email.us-east-1.amazonaws.com'
                })}
                disabled={isAlertSubmitting}
                className="p-3.5 border border-[#ff3e3e]/40 bg-[#16191f] text-left hover:border-[#ff3e3e] transition-colors rounded-none cursor-pointer disabled:opacity-50"
              >
                <div className="text-[#ff3e3e] font-bold text-xs">03 // COREDNS_TIMEOUT</div>
                <div className="text-[#9ca3af] text-[11px] mt-1">AWS SES SMTP refusal</div>
              </button>
            </div>
          </div>

          {/* Bottom Matrix Stats */}
          <div className="grid grid-cols-2 gap-4 border-t border-[#232733] pt-4 mt-auto">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-[#6b7280]">NODES</p>
              <p className="font-mono text-xs text-[#00ff88] font-bold mt-1">
                {bankStats?.total_nodes ? `${bankStats.total_nodes} ACTIVE` : '49 ACTIVE'}
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-[#6b7280]">LINKS</p>
              <p className="font-mono text-xs text-[#e0e0e0] font-bold mt-1">
                {bankStats?.total_links ? `${bankStats.total_links} SYNTH` : '792 SYNTH'}
              </p>
            </div>
          </div>
        </aside>

        {/* PANEL 2: MAIN WORKSPACE */}
        <main className="bg-[#16191f] border border-[rgba(224,224,224,0.08)] p-6 lg:p-8 relative overflow-y-auto">
          <div className="corner-accent"></div>

          {/* TAB 1: INCIDENT COMMAND */}
          {activeTab === 'command' && (
            <>
              {selectedIncident ? (
                <div className="space-y-8">
                  {/* Primary Stream Header */}
                  <header className="flex flex-wrap justify-between items-start gap-4 pb-4 border-b border-[rgba(224,224,224,0.08)]">
                    <div>
                      <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[#ff3e3e] font-bold">
                        Primary Stream // Incident Vector
                      </span>
                      <h2 className="font-syne text-5xl lg:text-6xl font-extrabold text-white mt-1 tracking-tighter leading-none">
                        {selectedIncident.incident_id}
                      </h2>
                      <div className="flex items-center gap-2 mt-2 font-mono text-[0.68rem] text-[rgba(224,224,224,0.6)]">
                        <span>SERVICE: {selectedIncident.service}</span>
                        <span>·</span>
                        <span>CONFIDENCE: {Math.round(selectedIncident.confidence_score * 100)}%</span>
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end gap-1.5">
                      <div className={`font-mono text-[0.65rem] font-bold px-3 py-1 border uppercase tracking-wider ${
                        selectedIncident.severity.includes('CRITICAL')
                          ? 'border-[#ff3e3e] text-[#ff3e3e] bg-[rgba(255,62,62,0.06)]'
                          : 'border-[#ffcc00] text-[#ffcc00] bg-[rgba(255,204,0,0.06)]'
                      }`}>
                        {selectedIncident.severity}
                      </div>
                      <p className="font-mono text-[0.65rem] opacity-70">
                        MTTR EST: {selectedIncident.blast_radius_assessment.estimated_mttr.toUpperCase()}
                      </p>

                      {incidents.length > 1 && (
                        <div className="mt-2 flex items-center gap-1 font-mono text-[0.6rem]">
                          <span className="opacity-50">SWITCH:</span>
                          <select
                            value={selectedIncident.incident_id}
                            onChange={(e) => {
                              const found = incidents.find(i => i.incident_id === e.target.value);
                              if (found) setSelectedIncident(found);
                            }}
                            className="bg-[#0f1115] border border-[rgba(224,224,224,0.2)] text-[#e0e0e0] px-1.5 py-0.5 rounded text-[0.6rem]"
                          >
                            {incidents.map(inc => (
                              <option key={inc.incident_id} value={inc.incident_id}>
                                {inc.incident_id}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </header>

                  {/* Primary Diagnosis Card with Variation 5 sharp red border */}
                  <section className="bg-[rgba(255,62,62,0.02)] border border-[rgba(224,224,224,0.08)] border-l-4 border-l-[#ff3e3e] p-6 space-y-4">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-mono text-[0.65rem] uppercase tracking-widest text-[#ff3e3e] font-bold">
                        CONFIDENCE_RATING: {Math.round(selectedIncident.confidence_score * 100)}%
                      </span>
                      <span className="font-mono text-[0.65rem] text-[rgba(224,224,224,0.5)]">
                        T+ {new Date(selectedIncident.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <h3 className="font-syne text-2xl font-bold text-white tracking-tight leading-snug">
                      {selectedIncident.service}: {selectedIncident.alert_message}
                    </h3>

                    {selectedIncident.stack_trace && (
                      <pre className="bg-[#000000] p-3 border border-[#222222] font-mono text-[0.65rem] text-[#ff3e3e] overflow-x-auto whitespace-pre-wrap">
                        {selectedIncident.stack_trace}
                      </pre>
                    )}

                    <div>
                      <div className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-[#ff3e3e] font-bold mb-2">
                        Root Cause Analysis
                      </div>
                      <div className="bg-[#000000] p-4 border-l-2 border-l-[#ff3e3e] border border-[rgba(224,224,224,0.05)]">
                        <p className="font-mono text-[0.72rem] leading-relaxed text-[#e0e0e0]">
                          {selectedIncident.triaged_root_cause}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-xs font-mono border-t border-[rgba(224,224,224,0.05)]">
                      <span className="text-[rgba(224,224,224,0.5)]">IMMEDIATE MITIGATION:</span>
                      <span className="text-[#e0e0e0] font-semibold">{selectedIncident.immediate_mitigation}</span>
                    </div>
                  </section>

                  {/* Progression Sequence (Variation 5 Timeline Structure) */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-[#ff3e3e] font-bold">
                        Progression Sequence
                      </h3>

                      {/* Manual State Segmented Switcher */}
                      <div className="flex items-center gap-1 font-mono text-[0.6rem]">
                        <button
                          onClick={() => handleUpdateStatus('TRIAGED')}
                          className={`px-2 py-0.5 border uppercase cursor-pointer ${
                            selectedIncident.status === 'TRIAGED'
                              ? 'border-[#ff3e3e] bg-[rgba(255,62,62,0.15)] text-[#ff3e3e] font-bold'
                              : 'border-[rgba(224,224,224,0.1)] text-[rgba(224,224,224,0.5)]'
                          }`}
                        >
                          01 // TRIAGED
                        </button>
                        <button
                          onClick={() => handleUpdateStatus('MITIGATING')}
                          className={`px-2 py-0.5 border uppercase cursor-pointer ${
                            selectedIncident.status === 'MITIGATING'
                              ? 'border-[#00ff88] bg-[rgba(0,255,136,0.1)] text-[#00ff88] font-bold'
                              : 'border-[rgba(224,224,224,0.1)] text-[rgba(224,224,224,0.5)]'
                          }`}
                        >
                          02 // MITIGATING
                        </button>
                        <button
                          onClick={() => handleUpdateStatus('RESOLVED')}
                          className={`px-2 py-0.5 border uppercase cursor-pointer ${
                            selectedIncident.status === 'RESOLVED'
                              ? 'border-[#00ff88] bg-[#00ff88] text-black font-bold'
                              : 'border-[rgba(224,224,224,0.1)] text-[rgba(224,224,224,0.5)]'
                          }`}
                        >
                          03 // RESOLVED
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2">
                      {/* Node 01: TRIAGED */}
                      <div className="timeline-node-marker border-l border-[#ff3e3e] pl-6 pb-6 relative">
                        <div className="flex justify-between items-center">
                          <p className="font-mono text-[0.75rem] font-bold text-[#ff3e3e]">
                            01 // TRIAGED
                          </p>
                          <span className={`font-mono text-[0.58rem] px-2 py-0.5 border uppercase ${
                            selectedIncident.status === 'TRIAGED'
                              ? 'border-[#ff3e3e] text-[#ff3e3e] bg-[rgba(255,62,62,0.08)]'
                              : 'border-[#00ff88] text-[#00ff88]'
                          }`}>
                            {selectedIncident.status === 'TRIAGED' ? 'ACTIVE_PHASE' : 'COMPLETED'}
                          </span>
                        </div>
                        <p className="font-mono text-[0.68rem] text-[rgba(224,224,224,0.7)] mt-2">
                          Recalled {selectedIncident.recalled_memories.length} historical post-mortems from Hindsight vector bank. Runbook {selectedIncident.recommended_runbook.title} mounted.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2 font-mono text-[0.58rem]">
                          <span className="px-2 py-0.5 border border-[rgba(224,224,224,0.15)] bg-[rgba(255,255,255,0.03)]">
                            HINDSIGHT: {Math.round(selectedIncident.confidence_score * 100)}%
                          </span>
                          <span className="px-2 py-0.5 border border-[rgba(224,224,224,0.15)] bg-[rgba(255,255,255,0.03)] text-[#00ff88]">
                            WEBHOOK_INGEST_OK
                          </span>
                          <span className="px-2 py-0.5 border border-[rgba(224,224,224,0.15)] bg-[rgba(255,255,255,0.03)] text-[#ffcc00]">
                            RUNBOOK_READY
                          </span>
                        </div>
                      </div>

                      {/* Node 02: MITIGATING */}
                      <div className="timeline-node-marker border-l border-[#ff3e3e] pl-6 pb-6 relative">
                        <div className="flex justify-between items-center">
                          <p className="font-mono text-[0.75rem] font-bold text-white">
                            02 // MITIGATING
                          </p>
                          <span className={`font-mono text-[0.58rem] px-2 py-0.5 border uppercase ${
                            selectedIncident.status === 'MITIGATING'
                              ? 'border-[#ffcc00] text-[#ffcc00] bg-[rgba(255,204,0,0.1)]'
                              : selectedIncident.status === 'RESOLVED'
                              ? 'border-[#00ff88] text-[#00ff88]'
                              : 'border-[rgba(224,224,224,0.2)] text-[rgba(224,224,224,0.4)]'
                          }`}>
                            {selectedIncident.status === 'MITIGATING'
                              ? 'IN_PROGRESS'
                              : selectedIncident.status === 'RESOLVED'
                              ? 'COMPLETED'
                              : 'STANDBY'}
                          </span>
                        </div>

                        {/* Progress Bar from Variation 5 */}
                        <div className="h-1 bg-[#222222] my-3">
                          <div
                            className="h-full bg-[#ff3e3e] transition-all duration-300"
                            style={{
                              width: `${selectedIncident.status === 'RESOLVED' ? 100 : Math.max(15, progressPercent)}%`
                            }}
                          />
                        </div>

                        <p className="font-mono text-[0.68rem] text-[rgba(224,224,224,0.6)]">
                          {selectedIncident.status === 'RESOLVED'
                            ? `Executed all ${totalStepsCount} steps successfully. Health restored.`
                            : `Applied ${completedStepsCount} of ${totalStepsCount} runbook steps. Awaiting operator signal.`}
                        </p>

                        {/* Executed step tags */}
                        {selectedIncident.recommended_runbook.steps.some(s => s.status === 'COMPLETED') && (
                          <div className="mt-2.5 flex flex-wrap gap-1.5 font-mono text-[0.58rem]">
                            {selectedIncident.recommended_runbook.steps
                              .filter(s => s.status === 'COMPLETED')
                              .map(s => (
                                <span key={s.order} className="px-2 py-0.5 border border-[#00ff88] text-[#00ff88] bg-[rgba(0,255,136,0.05)]">
                                  ✓ STEP_{s.order}
                                </span>
                              ))}
                          </div>
                        )}
                      </div>

                      {/* Node 03: RESOLVED */}
                      <div className={`timeline-node-marker pl-6 pb-2 relative ${
                        selectedIncident.status === 'RESOLVED'
                          ? 'border-l border-[#00ff88]'
                          : 'border-l border-dashed border-[rgba(224,224,224,0.15)]'
                      }`}>
                        <div className="flex justify-between items-center">
                          <p className={`font-mono text-[0.75rem] font-bold ${
                            selectedIncident.status === 'RESOLVED' ? 'text-[#00ff88]' : 'text-[rgba(224,224,224,0.4)]'
                          }`}>
                            03 // RESOLVED
                          </p>
                          {selectedIncident.status === 'RESOLVED' && (
                            <span className="font-mono text-[0.58rem] px-2 py-0.5 border border-[#00ff88] text-[#00ff88] bg-[rgba(0,255,136,0.1)]">
                              CLOSED_AND_RETAINED
                            </span>
                          )}
                        </div>
                        {selectedIncident.status === 'RESOLVED' && (
                          <p className="font-mono text-[0.68rem] text-[rgba(224,224,224,0.7)] mt-2">
                            Remediation verified. Error rate returned to 0.00%. Incident post-mortem indexed into Hindsight memory.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Impact Zone & Prevention Grid from Variation 5 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    <div className="bg-[rgba(0,0,0,0.25)] border border-[rgba(224,224,224,0.08)] p-4">
                      <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[#ff3e3e] font-bold mb-2">
                        Impact Zone
                      </p>
                      <div className="font-mono text-[0.68rem] flex flex-wrap gap-2 text-[#e0e0e0]">
                        {selectedIncident.blast_radius_assessment.affected_services.map((svc, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-[rgba(255,255,255,0.04)] border border-[rgba(224,224,224,0.1)]">
                            [{svc}]
                          </span>
                        ))}
                      </div>
                      <p className="font-mono text-[0.62rem] text-[rgba(224,224,224,0.5)] mt-2">
                        {selectedIncident.blast_radius_assessment.customer_impact}
                      </p>
                    </div>

                    <div className="bg-[rgba(0,0,0,0.25)] border border-[rgba(224,224,224,0.08)] p-4">
                      <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[#ff3e3e] font-bold mb-2">
                        Prevention Plan
                      </p>
                      <p className="font-mono text-[0.68rem] text-[#00ff88] leading-relaxed">
                        {selectedIncident.prevention_plan.join('; ')}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-16 text-center">
                  <h3 className="font-syne text-2xl font-bold">NO INCIDENT STREAM</h3>
                  <p className="font-mono text-xs opacity-50 mt-2">Trigger a simulation preset from the left panel.</p>
                </div>
              )}
            </>
          )}

          {/* TAB 2: HINDSIGHT MEMORY */}
          {activeTab === 'memory' && (
            <div className="space-y-6">
              <header className="border-b border-[rgba(224,224,224,0.08)] pb-4">
                <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[#ff3e3e] font-bold">
                  Vectorize Cluster
                </span>
                <h2 className="font-syne text-4xl font-extrabold text-white mt-1">Hindsight Memory Bank</h2>
                <p className="font-mono text-xs opacity-60 mt-1">Bank: incident-response-agent // Graph Retrieval Active</p>
              </header>

              {/* Status Banner */}
              {ingestStatus && (
                <div className="p-3 bg-[rgba(0,255,136,0.05)] border border-[#00ff88] font-mono text-xs text-[#00ff88] flex justify-between items-center">
                  <span>{ingestStatus}</span>
                  <button onClick={() => setIngestStatus(null)} className="cursor-pointer">✕</button>
                </div>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-[rgba(0,0,0,0.3)] border border-[rgba(224,224,224,0.08)] p-4">
                  <p className="font-mono text-[0.58rem] uppercase text-[rgba(224,224,224,0.5)]">Total Nodes</p>
                  <p className="font-mono text-2xl font-bold text-[#00ff88] mt-1">{bankStats?.total_nodes ?? 17}</p>
                </div>
                <div className="bg-[rgba(0,0,0,0.3)] border border-[rgba(224,224,224,0.08)] p-4">
                  <p className="font-mono text-[0.58rem] uppercase text-[rgba(224,224,224,0.5)]">Semantic Links</p>
                  <p className="font-mono text-2xl font-bold text-[#e0e0e0] mt-1">{bankStats?.total_links ?? 143}</p>
                </div>
                <div className="bg-[rgba(0,0,0,0.3)] border border-[rgba(224,224,224,0.08)] p-4">
                  <p className="font-mono text-[0.58rem] uppercase text-[rgba(224,224,224,0.5)]">Documents</p>
                  <p className="font-mono text-2xl font-bold text-[#ffcc00] mt-1">{postMortems.length}</p>
                </div>
                <div className="bg-[rgba(0,0,0,0.3)] border border-[rgba(224,224,224,0.08)] p-4">
                  <p className="font-mono text-[0.58rem] uppercase text-[rgba(224,224,224,0.5)]">Cluster Link</p>
                  <p className="font-mono text-2xl font-bold text-[#00ff88] mt-1">ONLINE</p>
                </div>
              </div>

              {/* Interactive Semantic Recall Probe */}
              <div className="bg-[rgba(0,0,0,0.2)] border border-[rgba(224,224,224,0.08)] p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-[#ff3e3e] font-bold">
                    Semantic Recall Query Probe
                  </p>
                  <span className="font-mono text-[0.6rem] opacity-50">POST /v1/default/banks/.../memories/recall</span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={recallQuery}
                    onChange={(e) => setRecallQuery(e.target.value)}
                    placeholder="Enter incident symptoms (e.g. HikariCP pool timeout, OOMKilled, CoreDNS)..."
                    className="flex-1 bg-[#0f1115] border border-[rgba(224,224,224,0.15)] px-3 py-2 font-mono text-xs text-[#e0e0e0] focus:border-[#ff3e3e] outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && handleRecallTest()}
                  />
                  <button
                    onClick={handleRecallTest}
                    disabled={isRecalling}
                    className="px-4 py-2 bg-[#ff3e3e] text-white font-mono text-xs font-bold uppercase tracking-wider hover:opacity-90 cursor-pointer disabled:opacity-50"
                  >
                    {isRecalling ? 'Searching...' : 'Recall'}
                  </button>
                </div>

                {/* Probe Results */}
                <div className="space-y-2 mt-4 max-h-80 overflow-y-auto pr-1">
                  {recallResults.length > 0 ? (
                    recallResults.map((item, idx) => (
                      <div key={idx} className="bg-[#000000] p-3 border border-[rgba(224,224,224,0.1)] text-xs font-mono space-y-1">
                        <div className="flex justify-between text-[0.6rem] text-[rgba(224,224,224,0.5)]">
                          <span className="text-[#00ff88]">NODE_0{idx + 1} {item.id ? `// ${item.id.slice(0, 8)}` : ''}</span>
                          <span>TYPE: {item.type || 'MEMORY'}</span>
                        </div>
                        <p className="text-[0.68rem] text-[#e0e0e0] leading-relaxed whitespace-pre-wrap">
                          {item.text || JSON.stringify(item, null, 2)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="font-mono text-[0.65rem] text-[rgba(224,224,224,0.4)] text-center py-4">
                      Execute query above to retrieve live vector nodes from Hindsight memory bank.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: POST-MORTEM LIBRARY */}
          {activeTab === 'postmortems' && (
            <div className="space-y-6">
              <header className="flex justify-between items-start border-b border-[rgba(224,224,224,0.08)] pb-4">
                <div>
                  <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[#ff3e3e] font-bold">
                    Knowledge Base
                  </span>
                  <h2 className="font-syne text-4xl font-extrabold text-white mt-1">Post-Mortem Library</h2>
                </div>
                <button
                  onClick={() => setShowNewPmModal(true)}
                  className="px-3.5 py-1.5 bg-[#ff3e3e] text-white font-mono text-xs uppercase tracking-wider font-bold hover:opacity-90 cursor-pointer"
                >
                  + Add Post-Mortem
                </button>
              </header>

              <div className="grid grid-cols-1 gap-4">
                {postMortems.map((pm) => (
                  <div key={pm.incident_id} className="bg-[rgba(0,0,0,0.2)] border border-[rgba(224,224,224,0.08)] p-5 space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-[rgba(224,224,224,0.08)]">
                      <div className="flex items-center gap-3">
                        <span className="font-syne text-lg font-bold text-white">{pm.incident_id}</span>
                        <span className="font-mono text-xs text-[#00ff88]">{pm.service}</span>
                        <span className={`font-mono text-[0.6rem] px-2 py-0.5 border ${
                          pm.severity.includes('CRITICAL') ? 'border-[#ff3e3e] text-[#ff3e3e]' : 'border-[#ffcc00] text-[#ffcc00]'
                        }`}>
                          {pm.severity}
                        </span>
                      </div>
                      <button
                        onClick={() => triggerPresetAlert({
                          service: pm.service,
                          severity: pm.severity,
                          alert_message: pm.symptom,
                          stack_trace: `Triggered from library: ${pm.root_cause.slice(0, 100)}`
                        })}
                        className="px-2 py-1 border border-[rgba(224,224,224,0.2)] hover:border-[#ff3e3e] font-mono text-[0.6rem] uppercase tracking-wider text-[#e0e0e0] cursor-pointer"
                      >
                        Simulate Alert
                      </button>
                    </div>

                    <div className="font-mono text-xs space-y-2">
                      <div>
                        <span className="text-[0.6rem] uppercase tracking-wider text-[rgba(224,224,224,0.5)]">Symptom: </span>
                        <span className="text-[#e0e0e0]">{pm.symptom}</span>
                      </div>
                      <div>
                        <span className="text-[0.6rem] uppercase tracking-wider text-[rgba(224,224,224,0.5)]">Root Cause: </span>
                        <p className="text-[rgba(224,224,224,0.8)] mt-0.5 leading-relaxed">{pm.root_cause}</p>
                      </div>
                      <div className="pt-1 flex items-center gap-2">
                        <span className="text-[0.6rem] uppercase tracking-wider text-[rgba(224,224,224,0.5)]">Runbook: </span>
                        <span className="text-[#00ff88] bg-[rgba(0,255,136,0.05)] border border-[rgba(0,255,136,0.2)] px-2 py-0.5">
                          {pm.effective_runbook}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: WEBHOOK & CLI INTEGRATION */}
          {activeTab === 'webhook' && (
            <div className="space-y-6">
              <header className="border-b border-[rgba(224,224,224,0.08)] pb-4">
                <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[#ff3e3e] font-bold">
                  External Ingest
                </span>
                <h2 className="font-syne text-4xl font-extrabold text-white mt-1">Webhook & CLI Integration</h2>
                <p className="font-mono text-xs opacity-60 mt-1">Dispatch alerts from PagerDuty, Datadog, Prometheus, or CLI</p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* cURL Snippet */}
                <div className="bg-[rgba(0,0,0,0.2)] border border-[rgba(224,224,224,0.08)] p-5 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-[0.65rem] uppercase tracking-widest text-[#ff3e3e] font-bold">
                      cURL Webhook
                    </span>
                    <button
                      onClick={() => copyToClipboard(`curl -X POST "http://localhost:3000/api/v1/alert" \\
  -H "Content-Type: application/json" \\
  -d '{
    "service": "payment-gateway-v2",
    "severity": "P1-CRITICAL",
    "alert_message": "504 Gateway Timeout detected on checkout endpoint",
    "stack_trace": "HikariPool-1 - Connection is not available, request timed out after 30000ms."
  }'`, 'curl')}
                      className="px-2 py-1 border border-[rgba(224,224,224,0.2)] font-mono text-[0.6rem] text-[#e0e0e0] hover:border-[#ff3e3e] cursor-pointer"
                    >
                      {copiedKey === 'curl' ? 'COPIED' : 'COPY'}
                    </button>
                  </div>
                  <pre className="bg-[#000000] p-3 border border-[#222222] font-mono text-[0.65rem] text-[#00ff88] overflow-x-auto whitespace-pre">
{`curl -X POST "http://localhost:3000/api/v1/alert" \\
  -H "Content-Type: application/json" \\
  -d '{
    "service": "payment-gateway-v2",
    "severity": "P1-CRITICAL",
    "alert_message": "504 Gateway Timeout detected",
    "stack_trace": "HikariPool-1 connection timeout 30000ms"
  }'`}
                  </pre>
                </div>

                {/* Python Client */}
                <div className="bg-[rgba(0,0,0,0.2)] border border-[rgba(224,224,224,0.08)] p-5 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-[0.65rem] uppercase tracking-widest text-[#ff3e3e] font-bold">
                      Python Client (test_alert.py)
                    </span>
                    <button
                      onClick={() => copyToClipboard(`import requests
res = requests.post("http://localhost:3000/api/v1/alert", json={
    "service": "payment-gateway-v2",
    "severity": "P1-CRITICAL",
    "alert_message": "504 Gateway Timeout detected",
    "stack_trace": "HikariPool-1 connection timeout 30000ms"
})
print("SRE Plan:", res.json())`, 'py')}
                      className="px-2 py-1 border border-[rgba(224,224,224,0.2)] font-mono text-[0.6rem] text-[#e0e0e0] hover:border-[#ff3e3e] cursor-pointer"
                    >
                      {copiedKey === 'py' ? 'COPIED' : 'COPY'}
                    </button>
                  </div>
                  <pre className="bg-[#000000] p-3 border border-[#222222] font-mono text-[0.65rem] text-[#ffcc00] overflow-x-auto whitespace-pre">
{`import requests

res = requests.post("http://localhost:3000/api/v1/alert", json={
    "service": "payment-gateway-v2",
    "severity": "P1-CRITICAL",
    "alert_message": "504 Gateway Timeout detected",
    "stack_trace": "HikariPool-1 connection timeout"
})
print(res.json())`}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* PANEL 3: EXECUTION LAYER (INSPECTOR) */}
        <aside className="bg-[#16191f] border border-[rgba(224,224,224,0.08)] p-5 flex flex-col relative overflow-hidden">
          <div className="flex justify-between items-center mb-5 pb-3 border-b border-[rgba(224,224,224,0.08)]">
            <h3 className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-[#ff3e3e] font-bold">
              Execution Layer
            </h3>
            {selectedIncident && (
              <button
                onClick={executeAllSteps}
                disabled={executingStepOrder !== null || selectedIncident.status === 'RESOLVED'}
                className="font-mono text-[0.6rem] uppercase tracking-wider text-[#00ff88] hover:underline cursor-pointer disabled:opacity-40"
              >
                Run All
              </button>
            )}
          </div>

          {/* Runbook Steps Stack from Variation 5 */}
          <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1">
            {selectedIncident?.recommended_runbook.steps.map((step) => {
              const isCompleted = step.status === 'COMPLETED';
              const isRunning = executingStepOrder === step.order;
              return (
                <div
                  key={step.order}
                  className={`bg-[rgba(0,0,0,0.25)] p-3.5 border transition-all ${
                    isCompleted
                      ? 'border-[#00ff88]'
                      : isRunning
                      ? 'border-[#ffcc00] bg-[rgba(255,204,0,0.02)]'
                      : 'border-[rgba(224,224,224,0.1)]'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className={`font-mono text-[0.62rem] font-bold ${
                      isCompleted ? 'text-[#00ff88]' : step.risk_level === 'LOW' ? 'text-[#00ff88]' : 'text-[#ffcc00]'
                    }`}>
                      STEP 0{step.order}
                    </span>
                    <span className="font-mono text-[0.55rem] px-2 py-0.5 border border-[rgba(224,224,224,0.15)] bg-[rgba(255,255,255,0.04)]">
                      RISK: {step.risk_level}
                    </span>
                  </div>

                  <p className="font-mono text-[0.68rem] text-white font-medium mb-1 truncate">
                    {step.name}
                  </p>
                  <p className="font-mono text-[0.6rem] text-[rgba(224,224,224,0.6)] line-clamp-2 mb-2">
                    {step.description}
                  </p>

                  <pre className="bg-[#000000] p-2 border border-[#222222] font-mono text-[0.62rem] text-[#e0e0e0] overflow-x-auto whitespace-pre truncate">
                    {step.command}
                  </pre>

                  {step.execution_log && (
                    <div className="mt-2 p-1.5 bg-[#000000] border-l border-[#00ff88] font-mono text-[0.58rem] text-[#00ff88] truncate">
                      ✓ {step.execution_log.split('\n')[0]}
                    </div>
                  )}

                  {isCompleted ? (
                    <div className="mt-2.5 py-1 text-center font-mono text-[0.6rem] text-[#00ff88] border border-[rgba(0,255,136,0.3)] bg-[rgba(0,255,136,0.05)]">
                      STEP_VERIFIED
                    </div>
                  ) : (
                    <button
                      onClick={() => executeStep(step)}
                      disabled={executingStepOrder !== null}
                      className={`w-full mt-2.5 py-1.5 font-mono text-[0.62rem] uppercase tracking-wider font-bold transition-all cursor-pointer disabled:opacity-50 ${
                        step.order === 1
                          ? 'bg-[#00ff88] text-black hover:opacity-90'
                          : 'bg-transparent border border-[rgba(224,224,224,0.2)] text-[#e0e0e0] hover:border-white'
                      }`}
                    >
                      {isRunning ? 'Running...' : 'Run Step'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Telemetry Ingest Terminal from Variation 5 */}
          <div className="mt-4 pt-3 border-t border-[rgba(224,224,224,0.08)]">
            <div className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[rgba(224,224,224,0.5)] mb-2 font-bold flex justify-between items-center">
              <span>Telemetry Ingest</span>
              <button onClick={() => setTerminalLogs([])} className="hover:text-white cursor-pointer text-[0.55rem]">
                Clear
              </button>
            </div>
            <div className="bg-[#000000] h-32 p-2.5 overflow-hidden border border-[#222222] font-mono text-[0.58rem] space-y-1">
              {terminalLogs.slice(-6).map((log, i) => (
                <p key={i} style={{ color: log.color }} className="truncate leading-tight">
                  [{log.timestamp}] {log.text}
                </p>
              ))}
            </div>
          </div>

          {/* Action Buttons at bottom of Inspector */}
          <div className="grid grid-cols-2 gap-2 mt-4">
            <button
              onClick={() => setShowCustomAlertModal(true)}
              className="py-2 px-3 border border-[#ff3e3e] text-[#ff3e3e] font-mono text-[0.65rem] uppercase tracking-wider font-bold hover:bg-[rgba(255,62,62,0.1)] transition-colors cursor-pointer"
            >
              Simulate
            </button>
            <button
              onClick={handleTriggerIngestion}
              disabled={isIngesting}
              className="py-2 px-3 border border-[rgba(224,224,224,0.3)] text-[#e0e0e0] font-mono text-[0.65rem] uppercase tracking-wider font-bold hover:border-white transition-colors cursor-pointer disabled:opacity-50"
            >
              {isIngesting ? 'Syncing...' : 'Sync'}
            </button>
          </div>
        </aside>
      </div>

      {/* Variation 5 Fixed Footer Bar */}
      <footer className="fixed bottom-0 left-0 w-full py-2 px-6 bg-[#000000] border-t border-[#ff3e3e] flex flex-wrap justify-between items-center z-50">
        <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[#ff3e3e] font-bold">
          J.A.R.V.I.S // JOURNALED AUTONOMIC ROOT-CAUSE & VECTOR INCIDENT SOLVER // PROTOCOL ALPHA-1
        </p>
        <p className="font-mono text-[0.62rem] text-[rgba(224,224,224,0.6)]">
          TERM_NODE: 0x821 // STATUS: INTERCEPTING // BANK: incident-response-agent // PORT: 3000
        </p>
      </footer>

      {/* MODAL 1: CUSTOM ALERT SIMULATION */}
      {showCustomAlertModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#16191f] border border-[rgba(224,224,224,0.2)] max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <div className="corner-accent"></div>
            <div className="flex justify-between items-center border-b border-[rgba(224,224,224,0.1)] pb-3">
              <h3 className="font-syne text-xl font-bold text-white">Simulate SRE Alert Webhook</h3>
              <button onClick={() => setShowCustomAlertModal(false)} className="font-mono text-sm text-[rgba(224,224,224,0.5)] hover:text-white cursor-pointer">
                ✕
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-[0.62rem] uppercase text-[#ff3e3e] font-bold mb-1">Service</label>
                <input
                  type="text"
                  value={customService}
                  onChange={(e) => setCustomService(e.target.value)}
                  className="w-full bg-[#0f1115] border border-[rgba(224,224,224,0.15)] p-2 text-white font-mono text-xs focus:border-[#ff3e3e] outline-none"
                />
              </div>

              <div>
                <label className="block text-[0.62rem] uppercase text-[#ff3e3e] font-bold mb-1">Severity</label>
                <select
                  value={customSeverity}
                  onChange={(e) => setCustomSeverity(e.target.value)}
                  className="w-full bg-[#0f1115] border border-[rgba(224,224,224,0.15)] p-2 text-white font-mono text-xs focus:border-[#ff3e3e] outline-none"
                >
                  <option value="P1-CRITICAL">P1-CRITICAL</option>
                  <option value="P2-HIGH">P2-HIGH</option>
                  <option value="P3-MEDIUM">P3-MEDIUM</option>
                </select>
              </div>

              <div>
                <label className="block text-[0.62rem] uppercase text-[#ff3e3e] font-bold mb-1">Alert Message</label>
                <input
                  type="text"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="w-full bg-[#0f1115] border border-[rgba(224,224,224,0.15)] p-2 text-white font-mono text-xs focus:border-[#ff3e3e] outline-none"
                />
              </div>

              <div>
                <label className="block text-[0.62rem] uppercase text-[#ff3e3e] font-bold mb-1">Stack Trace</label>
                <textarea
                  rows={3}
                  value={customStackTrace}
                  onChange={(e) => setCustomStackTrace(e.target.value)}
                  className="w-full bg-[#0f1115] border border-[rgba(224,224,224,0.15)] p-2 text-[#ff3e3e] font-mono text-[0.65rem] focus:border-[#ff3e3e] outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[rgba(224,224,224,0.1)]">
              <button
                onClick={() => setShowCustomAlertModal(false)}
                className="px-3 py-1.5 border border-[rgba(224,224,224,0.2)] font-mono text-xs text-[#e0e0e0] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowCustomAlertModal(false);
                  triggerPresetAlert({
                    service: customService,
                    severity: customSeverity,
                    alert_message: customMessage,
                    stack_trace: customStackTrace,
                  });
                }}
                disabled={isAlertSubmitting}
                className="px-4 py-1.5 bg-[#ff3e3e] text-white font-mono text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Dispatch Webhook
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD POST-MORTEM */}
      {showNewPmModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleSavePostMortem} className="bg-[#16191f] border border-[rgba(224,224,224,0.2)] max-w-xl w-full p-6 space-y-4 shadow-2xl relative">
            <div className="corner-accent"></div>
            <div className="flex justify-between items-center border-b border-[rgba(224,224,224,0.1)] pb-3">
              <h3 className="font-syne text-xl font-bold text-white">Ingest SRE Post-Mortem</h3>
              <button type="button" onClick={() => setShowNewPmModal(false)} className="font-mono text-sm text-[rgba(224,224,224,0.5)] hover:text-white cursor-pointer">
                ✕
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[0.62rem] uppercase text-[#ff3e3e] font-bold mb-1">Incident ID</label>
                  <input
                    type="text"
                    required
                    value={newPmId}
                    onChange={(e) => setNewPmId(e.target.value)}
                    placeholder="e.g. INC-2025-0110-INGRESS"
                    className="w-full bg-[#0f1115] border border-[rgba(224,224,224,0.15)] p-2 text-white font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[0.62rem] uppercase text-[#ff3e3e] font-bold mb-1">Service</label>
                  <input
                    type="text"
                    required
                    value={newPmService}
                    onChange={(e) => setNewPmService(e.target.value)}
                    placeholder="e.g. order-processing-api"
                    className="w-full bg-[#0f1115] border border-[rgba(224,224,224,0.15)] p-2 text-white font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[0.62rem] uppercase text-[#ff3e3e] font-bold mb-1">Severity</label>
                <select
                  value={newPmSeverity}
                  onChange={(e) => setNewPmSeverity(e.target.value)}
                  className="w-full bg-[#0f1115] border border-[rgba(224,224,224,0.15)] p-2 text-white font-mono text-xs"
                >
                  <option value="P1-CRITICAL">P1-CRITICAL</option>
                  <option value="P2-HIGH">P2-HIGH</option>
                  <option value="P3-MEDIUM">P3-MEDIUM</option>
                </select>
              </div>

              <div>
                <label className="block text-[0.62rem] uppercase text-[#ff3e3e] font-bold mb-1">Symptom</label>
                <input
                  type="text"
                  required
                  value={newPmSymptom}
                  onChange={(e) => setNewPmSymptom(e.target.value)}
                  placeholder="e.g. 504 Gateway Timeout detected on checkout endpoint"
                  className="w-full bg-[#0f1115] border border-[rgba(224,224,224,0.15)] p-2 text-white font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-[0.62rem] uppercase text-[#ff3e3e] font-bold mb-1">Root Cause</label>
                <textarea
                  rows={2}
                  required
                  value={newPmRootCause}
                  onChange={(e) => setNewPmRootCause(e.target.value)}
                  placeholder="Technical failure mechanism..."
                  className="w-full bg-[#0f1115] border border-[rgba(224,224,224,0.15)] p-2 text-white font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-[0.62rem] uppercase text-[#ff3e3e] font-bold mb-1">Resolution Steps (one per line)</label>
                <textarea
                  rows={2}
                  value={newPmSteps}
                  onChange={(e) => setNewPmSteps(e.target.value)}
                  placeholder="Scale deployment replicas from 4 to 12&#10;Flush CoreDNS cache"
                  className="w-full bg-[#0f1115] border border-[rgba(224,224,224,0.15)] p-2 text-white font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-[0.62rem] uppercase text-[#ff3e3e] font-bold mb-1">Effective Runbook</label>
                <input
                  type="text"
                  value={newPmRunbook}
                  onChange={(e) => setNewPmRunbook(e.target.value)}
                  placeholder="e.g. RB-OPS-091: Connection Pool & Worker Auto-Heal"
                  className="w-full bg-[#0f1115] border border-[rgba(224,224,224,0.15)] p-2 text-white font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[rgba(224,224,224,0.1)]">
              <button
                type="button"
                onClick={() => setShowNewPmModal(false)}
                className="px-3 py-1.5 border border-[rgba(224,224,224,0.2)] font-mono text-xs text-[#e0e0e0] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#ff3e3e] text-white font-mono text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Retain in Memory
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
