import * as pdfjsLib from 'pdfjs-dist';
import { useCallback, useEffect, useRef, useState } from 'react';
import { drawHighlightsOnCanvas } from '../utils/drawHighlights.js';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3.0;
const ZOOM_STEP = 0.25;

function clampZoom(value) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

export function useSlides(filePath) {
  const [pageCount, setPageCount] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const pdfDocRef = useRef(null);

  useEffect(() => {
    setZoom(1);
  }, [currentIndex]);

  useEffect(() => {
    if (!filePath) {
      return undefined;
    }

    let cancelled = false;

    async function loadPdf() {
      setLoading(true);
      setError(null);
      setPageCount(0);
      setCurrentIndex(0);

      try {
        const data = await window.electronAPI.readPdfFile(filePath);
        const pdf = await pdfjsLib.getDocument({ data }).promise;

        if (cancelled) {
          pdf.destroy();
          return;
        }

        pdfDocRef.current = pdf;
        setPageCount(pdf.numPages);
        setCurrentIndex(0);
      } catch (err) {
        if (!cancelled) {
          setError(
            'Could not open this PDF. The file may be corrupt or not a valid PDF.',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPdf();

    return () => {
      cancelled = true;
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
        pdfDocRef.current = null;
      }
    };
  }, [filePath]);

  const goTo = useCallback(
    (index) => {
      if (pageCount === 0) {
        return;
      }

      const nextIndex = Math.max(0, Math.min(index, pageCount - 1));
      setCurrentIndex(nextIndex);
    },
    [pageCount],
  );

  const goNext = useCallback(() => {
    goTo(currentIndex + 1);
  }, [currentIndex, goTo]);

  const goPrev = useCallback(() => {
    goTo(currentIndex - 1);
  }, [currentIndex, goTo]);

  const zoomIn = useCallback(() => {
    setZoom((value) => clampZoom(value + ZOOM_STEP));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((value) => clampZoom(value - ZOOM_STEP));
  }, []);

  const zoomReset = useCallback(() => {
    setZoom(1);
  }, []);

  const setZoomClamped = useCallback((value) => {
    setZoom(clampZoom(value));
  }, []);

  const renderPage = useCallback(async (index, canvas) => {
    const pdf = pdfDocRef.current;
    if (!pdf || !canvas) {
      return;
    }

    const page = await pdf.getPage(index + 1);
    const context = canvas.getContext('2d');
    const scrollContainer = canvas.closest('[data-slide-scroll]');
    const containerWidth = scrollContainer?.clientWidth
      ? scrollContainer.clientWidth - 32
      : 800;
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = containerWidth / baseViewport.width;
    const viewport = page.getViewport({ scale });

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: context, viewport }).promise;
  }, []);

  const captureSlide = useCallback(async (index, highlights = []) => {
    const pdf = pdfDocRef.current;
    if (!pdf) {
      return null;
    }

    const page = await pdf.getPage(index + 1);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = 900 / baseViewport.width;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const context = canvas.getContext('2d');

    await page.render({
      canvasContext: context,
      viewport,
    }).promise;

    drawHighlightsOnCanvas(context, highlights, canvas.width, canvas.height);

    return canvas.toDataURL('image/png');
  }, []);

  const renderThumbnail = useCallback(async (index, canvas) => {
    const pdf = pdfDocRef.current;
    if (!pdf || !canvas) {
      return;
    }

    const page = await pdf.getPage(index + 1);
    const context = canvas.getContext('2d');
    const viewport = page.getViewport({ scale: 0.2 });

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: context, viewport }).promise;
  }, []);

  return {
    pageCount,
    currentIndex,
    zoom,
    loading,
    error,
    goNext,
    goPrev,
    goTo,
    zoomIn,
    zoomOut,
    zoomReset,
    setZoomClamped,
    renderPage,
    renderThumbnail,
    captureSlide,
  };
}
