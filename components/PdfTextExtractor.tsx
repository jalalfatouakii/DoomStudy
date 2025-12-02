import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

interface PdfTextExtractorProps {
    pdfBase64: string | null;
    onExtract: (text: string) => void;
    onError?: (error: string) => void;
}

export default function PdfTextExtractor({ pdfBase64, onExtract, onError }: PdfTextExtractorProps) {
    const webViewRef = useRef<WebView>(null);
    const [isWebViewLoaded, setIsWebViewLoaded] = useState(false);

    useEffect(() => {
        if (pdfBase64 && isWebViewLoaded && webViewRef.current) {
            // Send the base64 data to the WebView
            webViewRef.current.postMessage(JSON.stringify({ type: 'EXTRACT', data: pdfBase64 }));
        }
    }, [pdfBase64, isWebViewLoaded]);

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
        <script>
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        </script>
    </head>
    <body>
        <script>
            document.addEventListener('message', handleMessage);
            window.addEventListener('message', handleMessage);

            async function handleMessage(event) {
                try {
                    const message = JSON.parse(event.data);
                    if (message.type === 'EXTRACT') {
                        const pdfData = atob(message.data);
                        const loadingTask = pdfjsLib.getDocument({ data: pdfData });
                        const pdf = await loadingTask.promise;
                        
                        let fullText = '';
                        for (let i = 1; i <= pdf.numPages; i++) {
                            const page = await pdf.getPage(i);
                            const textContent = await page.getTextContent();
                            const pageText = textContent.items.map(item => item.str).join(' ');
                            fullText += pageText + '\\n';
                        }
                        
                        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SUCCESS', text: fullText }));
                    }
                } catch (error) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ERROR', message: error.toString() }));
                }
            }
        </script>
    </body>
    </html>
    `;

    const onMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'SUCCESS') {
                onExtract(data.text);
            } else if (data.type === 'ERROR') {
                if (onError) onError(data.message);
            }
        } catch (e) {
            console.error("Error parsing WebView message:", e);
        }
    };

    return (
        <View style={{ height: 0, width: 0, overflow: 'hidden' }}>
            <WebView
                ref={webViewRef}
                source={{ html: htmlContent }}
                onMessage={onMessage}
                onLoad={() => setIsWebViewLoaded(true)}
                javaScriptEnabled={true}
                originWhitelist={['*']}
            />
        </View>
    );
}
