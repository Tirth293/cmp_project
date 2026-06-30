/**
 * Generates a Microsoft Word compatible DOC file for the Bi-Monthly Report
 * @param {Object} reportData - The aggregated bi-monthly report data
 */
export const generateBiMonthlyReportDOC = (reportData) => {
  const header = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>Bi-Monthly Performance Report</title>
    <style>
      body { font-family: 'Calibri', 'Arial', sans-serif; line-height: 1.6; }
      h1 { color: #3b82f6; text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
      h2 { color: #1e293b; border-bottom: 1px solid #e2e8f0; margin-top: 30px; }
      table { width: 100%; border-collapse: collapse; margin: 20px 0; }
      th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; }
      th { background-color: #f8fafc; font-weight: bold; }
      .metric-label { color: #64748b; font-size: 0.9em; }
      .insight-box { background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 15px; margin: 20px 0; }
      .emp-card { margin-bottom: 40px; page-break-inside: avoid; }
    </style>
    </head><body>
  `;

  const footer = "</body></html>";

  let content = `
    <h1>2-MONTH PERFORMANCE REPORT</h1>
    <p style='text-align: center;'><b>Duration:</b> ${reportData.duration} | <b>Branches:</b> ${reportData.branches.join(' & ')}</p>
    
    <h2>Overall Performance Summary</h2>
    <table>
      <tr><th>Metric</th><th>Total Value</th></tr>
      <tr><td>Total Calls</td><td>${reportData.summary.total_calls}</td></tr>
      <tr><td>Total Bookings</td><td>${reportData.summary.total_bookings}</td></tr>
      <tr><td>Total SVP / SVD</td><td>${reportData.summary.total_svp} / ${reportData.summary.total_svd}</td></tr>
      <tr><td>Average Punctuality</td><td>${Number(reportData.summary.avg_punctuality || 0).toFixed(1)}%</td></tr>
      <tr><td>Total Leaves / UL</td><td>${reportData.summary.total_leaves} / ${reportData.summary.total_ul}</td></tr>
    </table>

    <div class='insight-box'>
      <h3>Final Performance Insights</h3>
      <p><b>Best Performer:</b> ${reportData.insights.bestPerformer}</p>
      <p><b>Needs Improvement:</b> ${reportData.insights.needsImprovement}</p>
      <p><b>Team Productivity Level:</b> ${reportData.insights.productivityLevel}</p>
      <p><b>Recommendation:</b> ${reportData.insights.recommendation}</p>
    </div>

    <h2>Individual Employee Analysis</h2>
  `;

  reportData.employees.forEach((emp, index) => {
    content += `
      <div class='emp-card'>
        <h3>Employee ${index + 1}: ${emp.name}</h3>
        <p><b>Branch:</b> ${emp.branch}</p>
        <table>
          <tr>
            <th>Total Calls</th>
            <th>SVP / SVD</th>
            <th>Bookings</th>
            <th>Punctuality</th>
            <th>Overall Rating</th>
          </tr>
          <tr>
            <td>${emp.total_calls}</td>
            <td>${emp.total_svp} / ${emp.total_svd}</td>
            <td>${emp.total_bookings}</td>
            <td>${Number(emp.avg_punctuality || 0).toFixed(1)}%</td>
            <td>${Number(emp.overall_rating || 0).toFixed(1)} / 5</td>
          </tr>
        </table>
        
        <p><b>Performance Analysis:</b></p>
        <ul>
          <li><b>Strengths:</b> ${emp.strengths || 'N/A'}</li>
          <li><b>Areas of Improvement:</b> ${emp.areas_of_improvement || 'N/A'}</li>
          <li><b>Behavior & Discipline:</b> ${emp.behavior_discipline || 'N/A'}</li>
          <li><b>Target Achievement:</b> ${emp.target_achievement || 'N/A'}</li>
        </ul>
      </div>
    `;
  });

  const source = header + content + footer;
  const blob = new Blob(['\ufeff', source], {
    type: 'application/msword'
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `BiMonthly_Report_${new Date().toLocaleDateString().replace(/\//g, '-')}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
