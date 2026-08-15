        function downloadPDF(fileName) {
            const baseURL = 'DATA_LINK_WILL_GOES_HERE';
            const fullURL = baseURL + fileName;
            const a = document.createElement('a');
            a.href = fullURL;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }