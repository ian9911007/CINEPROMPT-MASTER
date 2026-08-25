(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.CinePromptExport = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    function csvCell(value) {
        return `"${String(value == null ? '' : value).replaceAll('"', '""')}"`;
    }

    function buildShotCsv(shots) {
        const rows = [['Shot#', 'Action', 'Model', 'Schema', 'Warnings', 'Prompt']];
        (shots || []).forEach((shot, index) => rows.push([
            index + 1,
            shot.action,
            shot.model_profile || 'legacy',
            shot.schema_version || 'legacy',
            (shot.warnings || []).map((entry) => entry.title).join(' | '),
            shot.prompt
        ]));
        return rows.map((row) => row.map(csvCell).join(',')).join('\n');
    }

    function downloadShotCsv(shots, documentObject, urlApi) {
        const documentRef = documentObject || document;
        const URLRef = urlApi || URL;
        const blob = new Blob([buildShotCsv(shots)], { type: 'text/csv;charset=utf-8' });
        const url = URLRef.createObjectURL(blob);
        const link = documentRef.createElement('a');
        link.href = url;
        link.download = 'CINEPROMPT-ShotList.csv';
        link.style.display = 'none';
        documentRef.body.appendChild(link);
        link.click();
        documentRef.body.removeChild(link);
        setTimeout(() => URLRef.revokeObjectURL(url), 0);
    }

    return { csvCell, buildShotCsv, downloadShotCsv };
});
