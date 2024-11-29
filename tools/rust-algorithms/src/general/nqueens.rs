/// Checks if given position on board is safe
///
/// This function is part of the nqueens algorithms and checks
/// if given position on the chess board is safe to place a queen.
///
/// See [nqueens problem](https://de.wikipedia.org/wiki/Damenproblem) for the theoretical background.
///
/// # Arguments
///
/// * `board` - two dimensional Vector of chars
/// * `row` - the row of the position as usize
/// * `col` - the column of the position as usize
///
/// # Returns
///
/// * `bool` - true if position safe, false otherwise
///
/// # Panic
///
/// This function won't panic
///
/// # Examples
///
/// There are no examples because this function is called inside the nqueens solver function.
///
pub fn is_safe(board: &mut Vec<Vec<char>>, row: usize, col: usize) -> bool {
    // NOTE:    This function is called when queens in column are already placed.
    //          That's why we only need to check the left side.

    // Check row on the left side
    for i in 0..col {
        if board[row][i] == 'Q' {
            return false;
        }
    }

    let mut i = row + 1;
    let mut j = col + 1;

    // Check upper diagonal on the left side
    while i > 0 && j > 0 {
        if board[i - 1][j - 1] == 'Q' {
            return false;
        }
        i -= 1;
        j -= 1;
    }

    i = row + 1;
    j = col + 1;

    // Check lower diagonal on left side
    while i < board.len() && j > 0 {
        if board[i - 1][j - 1] == 'Q' {
            return false;
        }
        i += 1;
        j -= 1;
    }

    true
}

/// Solves the nqueens problem (recursive)
///
/// This function is part of the nqueens algorithms and inserts
/// the queens at safe positions recursively.
///
/// See [nqueens problem](https://de.wikipedia.org/wiki/Damenproblem) for the theoretical background.
///
/// # Arguments
///
/// * `board` - two dimensional Vector of chars
/// * `col` - the column of the position as usize
///
/// # Returns
///
/// * `bool` - true if nqueens was solved, false otherwise
///
/// # Panic
///
/// This function won't panic
///
/// # Examples
///
/// There are no examples because this function is called inside the nqueens solver function.
///
pub fn solve_nq_util(board: &mut Vec<Vec<char>>, col: usize) -> bool {
    // return true if all queens are placed
    if col >= board.len() {
        return true;
    }

    // try to place queen in all rows of a column
    for i in 0..board.len() {
        if is_safe(board, i, col) {
            // place the queen
            board[i][col] = 'Q';

            // recur to place rest of the queen
            if solve_nq_util(board, col + 1) {
                return true;
            }

            // if there is no safe position, then do not place a queen
            board[i][col] = '-';
        }
    }

    false
}

/// nqueens solver function
///
/// This function combines the is_safe and solve_nq_util function and is called
/// to receive the solution for a n x n sized board.
///
/// See [nqueens problem](https://de.wikipedia.org/wiki/Damenproblem) for the theoretical background.
///
/// # Arguments
///
/// * `n` - size of the board and amount of queens
///
/// # Returns
///
/// * `board` - two dimensional Vector of chars
///
/// # Panic
///
/// This function won't panic
///
/// # Examples
///
/// let solved = nqueens(4)
///
pub fn nqueens(n: usize) -> Vec<Vec<char>> {
    let mut board = vec![vec!['-'; n]; n];

    if !solve_nq_util(&mut board, 0) {
        println!("Solution doesn't exist!");
        return board;
    }

    board
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_board() {
        assert_eq!(vec![vec!['Q']], nqueens(1));
        assert_eq!(vec![vec!['-', 'Q'], vec!['Q', '-']], nqueens(2));
        assert_eq!(
            vec![
                vec!['Q', '-', '-'],
                vec!['-', '-', 'Q'],
                vec!['-', 'Q', '-']
            ],
            nqueens(3)
        );
        assert_eq!(
            vec![
                vec!['-', '-', 'Q', '-'],
                vec!['Q', '-', '-', '-'],
                vec!['-', '-', '-', 'Q'],
                vec!['-', 'Q', '-', '-']
            ],
            nqueens(4)
        );
    }

    #[test]
    fn test_is_safe() {
        let mut incomplete_board = vec![
            vec!['-', '-', 'Q', '-'],
            vec!['Q', '-', '-', '-'],
            vec!['-', '-', '-', 'Q'],
            vec!['-', '-', '-', '-'],
        ];

        assert_eq!(true, is_safe(&mut incomplete_board, 3, 1));
        assert_eq!(false, is_safe(&mut incomplete_board, 3, 2));
    }
}
