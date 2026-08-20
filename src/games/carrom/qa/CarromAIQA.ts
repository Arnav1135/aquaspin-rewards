import { QualityLevel } from '../components/CarromPerformanceManager';

interface QADiagnostic {
  category: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
  suggestion?: string;
}

export class CarromAIQA {
  static analyzePerformance(fps: number, drawCalls: number, triangles: number, quality: QualityLevel): QADiagnostic[] {
    const diagnostics: QADiagnostic[] = [];
    
    if (fps < 20) diagnostics.push({ category: 'performance', severity: 'CRITICAL', message: `FPS critically low: ${fps}`, suggestion: 'Reduce quality to LOW' });
    else if (fps < 30) diagnostics.push({ category: 'performance', severity: 'HIGH', message: `FPS below target: ${fps}`, suggestion: 'Reduce shadow quality or disable post-processing' });
    
    if (drawCalls > 200) diagnostics.push({ category: 'rendering', severity: 'MEDIUM', message: `High draw call count: ${drawCalls}`, suggestion: 'Consider batching or instancing' });
    if (triangles > 500000) diagnostics.push({ category: 'rendering', severity: 'MEDIUM', message: `High triangle count: ${triangles}`, suggestion: 'Enable LOD for distant objects' });
    
    return diagnostics;
  }

  static recommendOptimizations(diagnostics: QADiagnostic[]): string[] {
    const recommendations: string[] = [];
    const critical = diagnostics.filter(d => d.severity === 'CRITICAL');
    if (critical.length > 0) recommendations.push('IMMEDIATE: Reduce quality level');
    return recommendations;
  }
}
