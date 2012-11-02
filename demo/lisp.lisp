; Birthday paradox
; The following program calculates the smallest number of people in a room for whom the probability of completely unique birthdays is less than 50%.

(defconstant +year-size+ 365)
 
(defun birthday-paradox (probability number-of-people)
  (let ((new-probability (* (/ (- +year-size+ number-of-people)
                               +year-size+)
                            probability)))
    (if (< new-probability 0.5)
        (1+ number-of-people)
        (birthday-paradox new-probability (1+ number-of-people)))))

(format t "~A~%" (birthday-paradox 1.0 1))