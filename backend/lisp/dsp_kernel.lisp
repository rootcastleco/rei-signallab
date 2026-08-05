;;; ====================================================================
;;; REI SignalLab - Machine-Level Common Lisp DSP Kernel Plugin
;;; Optimizations: (optimize (speed 3) (safety 0) (space 0) (debug 0))
;;; Data Types: Unboxed (simple-array double-float (*))
;;; ====================================================================

(in-package :cl-user)

(defpackage :signallab-dsp
  (:use :cl)
  (:export #:biquad-filter-simd
           #:lisp-vector-fft
           #:lisp-convolve-simd
           #:lisp-quantize-buffer
           #:apply-kaiser-window-lisp))

(in-package :signallab-dsp)

;;; Machine-Level Biquad IIR Filter (Direct Form II Transposed)
(declaim (inline biquad-filter-simd))
(defun biquad-filter-simd (signal-in b0 b1 b2 a1 a2)
  "Applies 2nd-order IIR Biquad Filter to double-float vector at machine speed."
  (declare (optimize (speed 3) (safety 0) (space 0) (debug 0))
           (type (simple-array double-float (*)) signal-in)
           (type double-float b0 b1 b2 a1 a2))
  (let* ((len (length signal-in))
         (out (make-array len :element-type 'double-float))
         (z1 0.0d0)
         (z2 0.0d0))
    (declare (type fixnum len)
             (type double-float z1 z2))
    (dotimes (i len out)
      (let* ((x (aref signal-in i))
             (y (+ (* b0 x) z1)))
        (declare (type double-float x y))
        (setf z1 (- (+ (* b1 x) z2) (* a1 y)))
        (setf z2 (- (* b2 x) (* a2 y)))
        (setf (aref out i) y)))))

;;; Machine-Level Vector Convolution
(defun lisp-convolve-simd (sig-a sig-b)
  "Computes discrete linear convolution of two double-float vectors."
  (declare (optimize (speed 3) (safety 0) (space 0) (debug 0))
           (type (simple-array double-float (*)) sig-a sig-b))
  (let* ((len-a (length sig-a))
         (len-b (length sig-b))
         (out-len (+ len-a len-b -1))
         (result (make-array out-len :element-type 'double-float :initial-element 0.0d0)))
    (declare (type fixnum len-a len-b out-len))
    (dotimes (i len-a result)
      (dotimes (j len-b)
        (incf (aref result (+ i j))
              (* (aref sig-a i) (aref sig-b j)))))))

;;; Machine-Level Vector Bit Quantizer
(defun lisp-quantize-buffer (signal-in bits)
  "Quantizes double-float signal array to N-bit digital levels."
  (declare (optimize (speed 3) (safety 0) (space 0) (debug 0))
           (type (simple-array double-float (*)) signal-in)
           (type fixnum bits))
  (let* ((len (length signal-in))
         (out (make-array len :element-type 'double-float))
         (levels (expt 2.0d0 bits))
         (max-level (1- levels)))
    (declare (type fixnum len)
             (type double-float levels max-level))
    (dotimes (i len out)
      (let* ((x (aref signal-in i))
             (norm (max -1.0d0 (min 1.0d0 x)))
             (q (round (* (+ norm 1.0d0) 0.5d0 max-level))))
        (setf (aref out i) (- (* (/ (coerce q 'double-float) max-level) 2.0d0) 1.0d0))))))
