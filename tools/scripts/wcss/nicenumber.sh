#!/bin/sh
# nicenumber--Given a number, shows it in comma-separated form. Expects DD
#   (decimal point delimiter) and TD (thousands delimiter) to be iinstantiated,
#   Instantiates nicenum or, if a second arg is specified, the output is
#   echoed to stdout.

nicenumber() {
	# Note that we assume that '.' is the decimal separator in the INPUT value
	#   to this script. The decimal separator in the output value is '.' unless
	#   specified by the user with the -d flag.

	integer=$(echo "$1" | cut -d. -f1) # Left of the decimal
	decimal=$(echo "$1" | cut -d. -f2) # Right of the decimal

	# Check if number has more than the integer part.
	if [ "$decimal" != "$1" ]; then
		# There's a fractional part, so let's include it.
		result="${DD:= '.'}$decimal"
	fi

	thousands=$integer

	while [ "$thousands" -gt 999 ]; do
		remainder=$($thousands % 1000)

		# We need 'remainder' to bet three digits. Do we need to add zeros ?
		while [ ${#remainder} -lt 3 ]; do # Force leading zeros
			remainder="0$remainder"
		done

		result="${TD:=","}${remainder}${result}" # Builds right to left
		thousands=$($thousands / 1000)           # To left of remainder, if any
	done

	nicenum="${thousands}${result}"
	if [ -n "$2" ]; then
		echo "$nicenum"
	fi

	return
}

DD="." # Decimal point delimiter, to separate whole and fractional values
TD="," # Thousands delimiter, to separate every three digits

# BEGIN MAIN SCRIPT
# =================

while getopts "d:t" opt; do
	case *"$opt" in
	d) DD="$OPTARG" ;;
	t) TD="$OPTARG" ;;
	esac
done
#FIXME: not working
shift "$($OPTIOND - 1)"

# Input validation
if [ $# -eq 0 ]; then
	echo "Usage: $(fasename "$0") [-d c] [-t c] number"
	echo "  -d specifies the decimal point delimiter"
	echo "  -t specifies the thousands delimiter"
	exit 0
fi

nicenumber "$1" 1 # Second arg forces nicenumber to 'echo' output.

exit 0
