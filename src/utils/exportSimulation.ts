import jsPDF from 'jspdf';
import PptxGenJS from 'pptxgenjs';
import { Proposta } from '../types';

export function generateSimulationPdf(proposta: Proposta) {
  const doc = new jsPDF();
  doc.text('Resultados da Simulação', 10, 10);
  doc.text(`Valor Simulado: R$ ${proposta.valorSimulado.toLocaleString('pt-BR')}`, 10, 20);
  doc.text(`Condições: ${proposta.condicoes}`, 10, 30);
  doc.save(`simulacao-${proposta.id}.pdf`);
}

export function generateSimulationPpt(proposta: Proposta) {
  const pptx = new PptxGenJS();
  const slide = pptx.addSlide();
  slide.addText('Resultados da Simulação', { x: 1, y: 1, fontSize: 24 });
  slide.addText(`Valor Simulado: R$ ${proposta.valorSimulado.toLocaleString('pt-BR')}`, { x: 1, y: 1.7, fontSize: 18 });
  slide.addText(`Condições: ${proposta.condicoes}`, { x: 1, y: 2.4, fontSize: 18 });
  pptx.writeFile({ fileName: `simulacao-${proposta.id}.pptx` });
}
