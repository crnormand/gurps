'use strict'

// used to restrict text field inputs
export const digitsOnly = /^\d*$/
export const digitsAndDecimalOnly = /^\d*\.?\d*$/


export default function () {
    // Add the inputFilter method to jquery.
    //
    // Restricts input for the set of matched elements to the given inputFilter function.
    // Example usage: 
    //
    //   html.find('#damage').inputFilter(value => digitsOnly.test(value))
    //
    jQuery.fn.inputFilter = function (inputFilter) {
        return this.on("input keydown keyup mousedown mouseup select contextmenu drop", function () {
            if (inputFilter(this.value)) {
                this.oldValue = this.value
                this.oldSelectionStart = this.selectionStart
                this.oldSelectionEnd = this.selectionEnd
            } else if (this.hasOwnProperty('oldValue')) {
                this.value = this.oldValue
                this.setSelectionRange(this.oldSelectionStart, this.oldSelectionEnd)
            } else {
                this.value = '';
            }
        })
    }
}