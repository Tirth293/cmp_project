import jsPDF from 'jspdf';
import 'jspdf-autotable';
import companyLogo from '../pages/Transparent logo.png?inline';

const addCompanyHeader = (doc, title, subtitle = '') => {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(245, 248, 252);
  doc.rect(0, 0, pageWidth, 38, 'F');

  try {
    doc.addImage(companyLogo, 'PNG', 18, 8, 20, 20);
  } catch (error) {
    console.warn('Unable to add company logo to PDF:', error);
  }

  doc.setFontSize(20);
  doc.setTextColor(59, 130, 246);
  doc.text(title, pageWidth / 2, 18, { align: 'center' });

  if (subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(subtitle, pageWidth / 2, 27, { align: 'center' });
  }
};

const toNumber = (value) => Number(value) || 0;

const calculateRatio = (value, total) => (total > 0 ? (value / total) * 100 : null);

const getAverage = (values) => {
  const validValues = values.filter(value => Number.isFinite(value));
  if (!validValues.length) return null;
  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
};

const calculateAppraisalScore = (data) => {
  const metrics = Array.isArray(data.metrics) ? data.metrics : [];
  if (!metrics.length) return 'N/A';

  const totals = metrics.reduce((acc, metric) => ({
    calls: acc.calls + toNumber(metric.total_calls_made),
    visitsPlanned: acc.visitsPlanned + toNumber(metric.site_visits_planned),
    visitsDone: acc.visitsDone + toNumber(metric.site_visits_done),
    bookings: acc.bookings + toNumber(metric.total_bookings),
    unwantedLeaves: acc.unwantedLeaves + toNumber(metric.unwanted_leaves)
  }), {
    calls: 0,
    visitsPlanned: 0,
    visitsDone: 0,
    bookings: 0,
    unwantedLeaves: 0
  });

  const productivityRatios = [
    calculateRatio(totals.visitsPlanned, totals.calls),
    calculateRatio(totals.visitsDone, totals.visitsPlanned),
    calculateRatio(totals.visitsDone, totals.calls),
    calculateRatio(totals.bookings, totals.visitsDone),
    calculateRatio(totals.bookings, totals.calls)
  ].map(ratio => ratio === null ? null : Math.min(100, ratio));

  const productivityAverage = getAverage(productivityRatios);
  const productivityScore = productivityAverage === null ? 0 : productivityAverage * 0.6;

  const ratings = Array.isArray(data.ratings) ? data.ratings : [];
  const ratingValues = ratings.flatMap(rating => [
    toNumber(rating.team_captain_rating),
    toNumber(rating.team_leader_rating),
    toNumber(rating.hr_rating)
  ]).filter(value => value > 0);
  const ratingAverage = getAverage(ratingValues);
  const ratingScore = ratingAverage === null ? 0 : (Math.min(5, ratingAverage) / 5) * 30;

  const disciplineScore = Math.max(0, 10 - (totals.unwantedLeaves * 2));
  const availableWeight = 60 + (ratingAverage === null ? 0 : 30) + 10;
  const score = ((productivityScore + ratingScore + disciplineScore) / availableWeight) * 100;

  return `${Math.round(score)}%`;
};

/**
 * Generates a PDF appraisal report for an employee
 * @param {Object} data - The appraisal data
 */
export const generateAppraisalPDF = (data) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  addCompanyHeader(doc, 'Performance Appraisal Report', `Generated on: ${new Date().toLocaleDateString()}`);
  
  // Employee Info Section
  doc.setDrawColor(200);
  doc.line(20, 43, pageWidth - 20, 43);
  
  doc.setFontSize(14);
  doc.setTextColor(30);
  doc.text('Employee Details', 20, 53);
  
  doc.setFontSize(11);
  doc.text(`Name: ${data.name || 'N/A'}`, 20, 63);
  doc.text(`Role: ${data.role || 'N/A'}`, 20, 70);
  doc.text(`Department: ${data.department || 'N/A'}`, 20, 77);
  doc.text(`Reporting To: ${data.reportingTo || 'N/A'}`, 120, 63);
  doc.text(`Period: ${data.period || 'Last 2 Months'}`, 120, 70);

  // Attendance and Leave Summary
  const attendanceSummary = data.attendanceSummary || {};
  const leaveSummary = data.leaveSummary || {};
  const attendanceLeaveRows = [[
    String(attendanceSummary.total_attendance || 0),
    String(leaveSummary.total_leaves || 0),
    String(leaveSummary.approved_leaves || 0),
    String(leaveSummary.approved_leave_days || 0)
  ]];

  doc.setFontSize(14);
  doc.text('Attendance & Leave Summary', 20, 93);

  doc.autoTable({
    startY: 98,
    head: [['Total Attendance', 'Total Leaves', 'Approved Leaves', 'Approved Leave Days']],
    body: attendanceLeaveRows,
    theme: 'grid',
    headStyles: { fillColor: [16, 185, 129] },
    styles: { fontSize: 10, halign: 'center' },
    margin: { left: 20, right: 20 }
  });
  
  // Metrics Table
  const metricsY = doc.lastAutoTable.finalY + 15;
  doc.setFontSize(14);
  doc.text('Performance Metrics', 20, metricsY);
  
  const metricsData = data.metrics && data.metrics.length > 0 
    ? data.metrics.map(m => [
        new Date(m.month_year).toLocaleDateString('default', { month: 'short', year: 'numeric' }),
        m.total_calls_made || 0,
        m.site_visits_done || 0,
        m.total_bookings || 0
      ])
    : [['No quantitative metrics recorded yet.', '', '', '']];
  
  const metricsHead = [['Month', 'Calls', 'Visits', 'Bookings']];
  
  doc.autoTable({
    startY: metricsY + 5,
    head: metricsHead,
    body: metricsData,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
    margin: { left: 20, right: 20 }
  });
  
  // Final Score
  const scoreY = doc.lastAutoTable.finalY + 18;
  const appraisalScore = calculateAppraisalScore(data);
  doc.setFontSize(18);
  doc.setTextColor(30);
  doc.text(`Overall Appraisal Score: ${appraisalScore}`, pageWidth - 20, scoreY, { align: 'right' });
  
  // Footer
  doc.setFontSize(10);
  doc.setTextColor(150);
  doc.text('This is an official system-generated Performance Appraisal Document.', pageWidth / 2, 285, { align: 'center' });
  
  doc.save(`Appraisal_${data.name.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`);
};

/**
 * Generates a comprehensive PDF for the Bi-Monthly Report
 * @param {Object} reportData - The aggregated bi-monthly report data
 */
export const generateBiMonthlyReportPDF = (reportData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  addCompanyHeader(doc, '2-MONTH PERFORMANCE REPORT', `${reportData.duration} | Branches: ${reportData.branches.join(' & ')}`);
  
  // Summary Section
  doc.setFontSize(16);
  doc.setTextColor(30);
  doc.text('Overall Performance Summary', 20, 55);
  
  const summaryBody = [
    ['Total Calls', String(reportData.summary.total_calls || 0)],
    ['Total Bookings', String(reportData.summary.total_bookings || 0)],
    ['SVP / SVD', `${reportData.summary.total_svp || 0} / ${reportData.summary.total_svd || 0}`],
    ['Avg Punctuality', `${Number(reportData.summary.avg_punctuality || 0).toFixed(1)}%`],
    ['Total Leaves / UL', `${reportData.summary.total_leaves || 0} / ${reportData.summary.total_ul || 0}`]
  ];
  
  doc.autoTable({
    startY: 60,
    body: summaryBody,
    theme: 'grid',
    styles: { fontSize: 11, cellPadding: 5 },
    columnStyles: { 0: { fontStyle: 'bold', width: 60 } },
    margin: { left: 20, right: 100 }
  });

  // Insights Box
  const insightsY = 60;
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.5);
  doc.rect(110, insightsY, 80, 45);
  doc.setFontSize(12);
  doc.text('Key Insights', 115, insightsY + 8);
  doc.setFontSize(9);
  doc.text(`Best Performer: ${reportData.insights.bestPerformer}`, 115, insightsY + 18);
  doc.text(`Needs Improvement: ${reportData.insights.needsImprovement}`, 115, insightsY + 25);
  doc.text(`Productivity: ${reportData.insights.productivityLevel}`, 115, insightsY + 32);
  doc.setFontSize(8);
  doc.text(`Rec: ${reportData.insights.recommendation}`, 115, insightsY + 40, { maxWidth: 70 });

  // Employee Details
  doc.setFontSize(16);
  doc.setTextColor(30);
  doc.text('Individual Employee Deep-Dive', 20, doc.lastAutoTable.finalY + 20);
  
  reportData.employees.forEach((emp, index) => {
    let startY = doc.lastAutoTable.finalY + 25;
    if (startY > 230) {
      doc.addPage();
      startY = 20;
    }
    
    doc.setFontSize(13);
    doc.setTextColor(59, 130, 246);
    doc.text(`${index + 1}. ${emp.name} (${emp.branch})`, 20, startY);
    
    const empMetrics = [
      ['Calls', 'Bookings', 'Punctuality', 'Rating'],
      [
        String(emp.total_calls || 0), 
        String(emp.total_bookings || 0), 
        `${Number(emp.avg_punctuality || 0).toFixed(1)}%`,
        `${Number(emp.overall_rating || 0).toFixed(1)}/5`
      ]
    ];
    
    doc.autoTable({
      startY: startY + 5,
      head: [empMetrics[0]],
      body: [empMetrics[1]],
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 3, halign: 'center' },
      headStyles: { fillColor: [240, 240, 240], textColor: [50, 50, 50], fontStyle: 'bold' }
    });
    
    const analysisY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : startY + 15) + 10;
    doc.setFontSize(9);
    doc.setTextColor(80);
    
    let currentY = analysisY;
    const leftMargin = 25;
    const textWidth = 160;

    const strengthsLines = doc.splitTextToSize(`Strengths: ${emp.strengths || 'N/A'}`, textWidth);
    doc.text(strengthsLines, leftMargin, currentY);
    currentY += (strengthsLines.length * 5) + 2;

    const improvementLines = doc.splitTextToSize(`Improvement: ${emp.areas_of_improvement || 'N/A'}`, textWidth);
    doc.text(improvementLines, leftMargin, currentY);
    currentY += (improvementLines.length * 5) + 2;

    const behaviorLines = doc.splitTextToSize(`Discipline: ${emp.behavior_discipline || 'N/A'}`, textWidth);
    doc.text(behaviorLines, leftMargin, currentY);
    currentY += (behaviorLines.length * 5) + 2;

    const targetLines = doc.splitTextToSize(`Targets: ${emp.target_achievement || 'N/A'}`, textWidth);
    doc.text(targetLines, leftMargin, currentY);
    currentY += (targetLines.length * 5) + 5;
    
    if (doc.lastAutoTable) doc.lastAutoTable.finalY = currentY;
  });
  
  // Footer
  const finalPageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= finalPageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${finalPageCount} | Performance Analytics`, pageWidth / 2, 288, { align: 'center' });
  }
  
  doc.save(`BiMonthly_Report_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`);
};
