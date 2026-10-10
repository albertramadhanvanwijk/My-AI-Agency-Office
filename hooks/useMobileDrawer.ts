"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface UseMobileDrawerOptions {
  onClose?: () => void;
  onOpen?: () => void;
  swipeThreshold?: number;
  enableSwipe?: boolean;
  enableBackdropClick?: boolean;
  trapFocus?: boolean;
}

interface UseMobileDrawerReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  drawerRef: React.RefObject<HTMLDivElement | null>;
  backdropRef: React.RefObject<HTMLDivElement | null>;
  handleTouchStart: (e: React.TouchEvent) => void;
  handleTouchMove: (e: React.TouchEvent) => void;
  handleTouchEnd: () => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
}

export function useMobileDrawer({
  onClose,
  onOpen,
  swipeThreshold = 80,
  enableSwipe = true,
  enableBackdropClick = true,
  trapFocus = true,
}: UseMobileDrawerOptions = {}): UseMobileDrawerReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchCurrentX, setTouchCurrentX] = useState(0);
  const isDragging = useRef(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const open = useCallback(() => {
    setIsOpen(true);
    previousActiveElement.current = document.activeElement as HTMLElement;
    document.body.style.overflow = "hidden";
    onOpen?.();
  }, [onOpen]);

  const close = useCallback(() => {
    setIsOpen(false);
    document.body.style.overflow = "";
    onClose?.();
    // Restore focus to trigger element
    previousActiveElement.current?.focus();
  }, [onClose]);

  const toggle = useCallback(() => {
    if (isOpen) close();
    else open();
  }, [isOpen, open, close]);

  // Handle swipe gestures
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enableSwipe || !isOpen) return;
    const touch = e.touches[0];
    setTouchStartX(touch.clientX);
    setTouchCurrentX(touch.clientX);
    isDragging.current = true;
  }, [enableSwipe, isOpen]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enableSwipe || !isOpen || !isDragging.current) return;
    const touch = e.touches[0];
    setTouchCurrentX(touch.clientX);
  }, [enableSwipe, isOpen]);

  const handleTouchEnd = useCallback(() => {
    if (!enableSwipe || !isOpen || !isDragging.current) return;
    isDragging.current = false;

    const deltaX = touchCurrentX - touchStartX;
    // Swipe right to close (drawer on left)
    if (deltaX > swipeThreshold) {
      close();
    }
  }, [enableSwipe, isOpen, swipeThreshold, touchCurrentX, touchStartX, close]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }

      if (trapFocus && e.key === "Tab") {
        const drawer = drawerRef.current;
        if (!drawer) return;

        const focusableElements = drawer.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    },
    [isOpen, close, trapFocus]
  );

  // Handle backdrop click
  const handleBackdropClick = useCallback(() => {
    if (enableBackdropClick) {
      close();
    }
  }, [enableBackdropClick, close]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Trap focus when open
  useEffect(() => {
    if (isOpen && trapFocus && drawerRef.current) {
      const focusableElements = drawerRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusableElements[0]?.focus();
    }
  }, [isOpen, trapFocus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return {
    isOpen,
    open,
    close,
    toggle,
    drawerRef,
    backdropRef,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleKeyDown,
  };
}

// Helper hook for swipeable sheet component
export function useSwipeableDrawer(
  isOpen: boolean,
  onClose: () => void,
  options: { threshold?: number; direction?: "left" | "right" } = {}
) {
  const { threshold = 100, direction = "left" } = options;
  const [offsetX, setOffsetX] = useState(0);
  const touchStartRef = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isOpen) return;
    touchStartRef.current = e.touches[0].clientX;
  }, [isOpen]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isOpen) return;
    const deltaX = e.touches[0].clientX - touchStartRef.current;
    // Only allow swipe in closing direction
    if (direction === "left" && deltaX > 0) {
      setOffsetX(Math.min(deltaX, 300));
    } else if (direction === "right" && deltaX < 0) {
      setOffsetX(Math.max(deltaX, -300));
    }
  }, [isOpen, direction]);

  const handleTouchEnd = useCallback(() => {
    if (!isOpen) return;
    const shouldClose = direction === "left" ? offsetX > threshold : offsetX < -threshold;
    if (shouldClose) {
      onClose();
    }
    setOffsetX(0);
  }, [isOpen, onClose, offsetX, direction, threshold]);

  const style = {
    transform: `translateX(${offsetX}px)`,
    transition: offsetX === 0 ? "transform 0.2s ease-out" : "none",
  } as React.CSSProperties;

  return { style, handleTouchStart, handleTouchMove, handleTouchEnd };
}