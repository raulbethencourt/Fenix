use std::cmp;

/// Compute the length of cuts that have the highest value
///
/// See [Rod Cutting Problem](https://en.wikipedia.org/wiki/Cutting_stock_problem) for the theoretical background
///
/// # Arguments
///
/// * `price` - Vector of u32 numbers which represent the prices
///
/// # Returns
///
/// * `val` - the max value that can be achieved
///
/// # Panic
///
/// This function won't panic
///
/// # Examples
///
/// use std::cmp;
///
/// let max_val = rod_cutting(&mut vec![1, 2, 3, 4, 5, 6, 7, 8]);
///
pub fn rod_cutting(price: &mut Vec<u32>) -> u32 {
    let length = price.len();

    if length == 0 {
        return 0;
    }

    let mut val = vec![0; (length + 1) as usize];
    val[0] = 0;

    // build the table in bottom up manner and return the last entry from the table
    for j in 1..length + 1 {
        let mut max_val = 0;

        for i in 0..j {
            max_val = cmp::max(max_val, price[i] + val[j - i - 1]);
            val[j] = max_val;
        }
    }

    val[length as usize]
}

/// Compute the length of cuts that have the highest value (recursive)
///
/// See [Rod Cutting Problem](https://en.wikipedia.org/wiki/Cutting_stock_problem) for the theoretical background
///
/// # Arguments
///
/// * `price` - Vector of u32 numbers which represent the prices
/// * `length` - length of the given price vector
///
/// # Returns
///
/// * `max_val` - the max value that can be achieved
///
/// # Panic
///
/// This function won't panic
///
/// # Examples
///
/// use std::cmp;
///
/// let max_val = rod_cutting_recursive(&mut vec![1, 2, 3, 4, 5, 6, 7, 8], 8);
///

pub fn rod_cutting_recursive(price: &mut Vec<u32>, length: u32) -> u32 {
    if length == 0 {
        return 0;
    }

    let mut max_val = 0;

    // Recursively cut the rod in different pieces and compare different configurations
    for i in 0..length as usize {
        max_val = cmp::max(
            max_val,
            price[i] + rod_cutting_recursive(price, length - i as u32 - 1),
        );
    }

    max_val
}

#[cfg(test)]
mod test {
    use super::rod_cutting;
    use super::rod_cutting_recursive;

    #[test]
    fn test_rod_cutting() {
        assert_eq!(8, rod_cutting(&mut vec![1, 2, 3, 4, 5, 6, 7, 8]));
        assert_eq!(22, rod_cutting(&mut vec![1, 5, 8, 9, 10, 17, 17, 20]));
        assert_eq!(13, rod_cutting(&mut vec![1, 5, 8, 9, 10]));
    }

    #[test]
    fn test_rod_cutting_recursive() {
        assert_eq!(
            8,
            rod_cutting_recursive(&mut vec![1, 2, 3, 4, 5, 6, 7, 8], 8)
        );
        assert_eq!(
            22,
            rod_cutting_recursive(&mut vec![1, 5, 8, 9, 10, 17, 17, 20], 8)
        );
        assert_eq!(13, rod_cutting_recursive(&mut vec![1, 5, 8, 9, 10], 5));
    }
}
