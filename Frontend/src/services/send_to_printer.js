function printImage(url, label = '', index) {
    const win = window.open('', '_blank', 'width=400,height=400');
    const doc = win.document;

    const container = doc.createElement('div');
    const img = doc.createElement('img');
    img.src = url;
    img.style = 'width: 100px; height: 100px; object-fit: contain;';

    const style = doc.createElement('style');
    style.textContent = `
        body {
            margin: 0;
            padding: 0;
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            font-family: Arial, sans-serif;
        }

        .container {
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: center;
        }

        .label {
            font-size: 14px;
            margin-right: 10px;
            max-width: 120px;
            word-break: break-word;
            text-align: right;
        }
    `;

    container.className = 'container';

    if (label && label.trim() !== '') {
        const labelEl = doc.createElement('div');
        labelEl.className = 'label';

        // Append index if provided
        labelEl.textContent = index !== undefined ? `${label} (${index})` : label;

        container.appendChild(labelEl);
    }

    container.appendChild(img);
    doc.head.appendChild(style);
    doc.body.appendChild(container);

    img.onload = () => {
        win.print();
        win.close();
    };
}

export default printImage;
