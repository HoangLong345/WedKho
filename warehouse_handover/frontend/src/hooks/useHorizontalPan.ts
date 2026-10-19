import { useEffect, useRef, useState, MouseEvent as ReactMouseEvent } from "react";

/**
 * Hook cho phép đè giữ chuột trái (hoặc chuột giữa) để kéo cuộn ngang bảng dữ liệu.
 * Tự động chặn sự kiện click nhầm vào nút con và chống bôi đen văn bản khi đang kéo.
 */
export function useLeftClickHorizontalPan() {
  const [isPanning, setIsPanning] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const panState = useRef({
    isDown: false,
    startX: 0,
    scrollLeft: 0,
    hasMoved: false,
  });

  useEffect(() => {
    const onWindowMouseMove = (e: MouseEvent) => {
      if (!panState.current.isDown || !containerRef.current) return;
      const walk = e.clientX - panState.current.startX;
      if (Math.abs(walk) > 3) {
        panState.current.hasMoved = true;
        setIsPanning(true);
        // Tránh bôi đen chữ khi đang kéo chuột trái
        window.getSelection()?.removeAllRanges();
      }
      containerRef.current.scrollLeft = panState.current.scrollLeft - walk;
    };

    const onWindowMouseUp = () => {
      if (panState.current.isDown) {
        panState.current.isDown = false;
        setIsPanning(false);
      }
    };

    const onWindowBlur = () => {
      if (panState.current.isDown) {
        panState.current.isDown = false;
        setIsPanning(false);
      }
    };

    window.addEventListener("mousemove", onWindowMouseMove);
    window.addEventListener("mouseup", onWindowMouseUp);
    window.addEventListener("blur", onWindowBlur);
    return () => {
      window.removeEventListener("mousemove", onWindowMouseMove);
      window.removeEventListener("mouseup", onWindowMouseUp);
      window.removeEventListener("blur", onWindowBlur);
    };
  }, []);

  const handleMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    // 0: Chuột trái, 1: Chuột giữa
    if (e.button === 0 || e.button === 1) {
      panState.current = {
        isDown: true,
        startX: e.clientX,
        scrollLeft: e.currentTarget.scrollLeft,
        hasMoved: false,
      };
    }
  };

  const handleClickCapture = (e: ReactMouseEvent<HTMLDivElement>) => {
    // Nếu vừa thực hiện thao tác kéo di chuyển, hủy click để không bấm nhầm nút con
    if (panState.current.hasMoved) {
      e.preventDefault();
      e.stopPropagation();
      panState.current.hasMoved = false;
    }
  };

  return {
    ref: containerRef,
    isPanning,
    panProps: {
      ref: containerRef,
      onMouseDown: handleMouseDown,
      onClickCapture: handleClickCapture,
    },
  };
}
