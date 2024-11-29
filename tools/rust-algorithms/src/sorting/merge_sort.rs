// The Merge Sort algorithm is a sorting algorithm that is based on the Divide and Conquer paradigm.

// The Time complexity is `O(nlog(n))` where n is the length of the array.

// Auxillary Space required is `O(n)` Since all the elements are copied to the auxillary space.
pub fn merge_sort<T: Ord + Copy>(array: &[T]) -> Vec<T> {
    if array.len() < 2 {
        return array.to_vec();
    }
    // Get the middle element of the array.
    let middle = array.len() / 2;
    // Divide the array into left and right halves.
    let mut left = merge_sort(&array[..middle]);
    let mut right = merge_sort(&array[middle..]);
    // Call merge function using parameters as both left array and right array.
    merge(&mut left, &mut right)
}

fn merge<T: Ord + Copy>(left: &mut Vec<T>, right: &mut Vec<T>) -> Vec<T> {
    let mut result = Vec::new();

    for _ in 0..left.len() + right.len() {
        if left.is_empty() {
            result.append(right);
            break;
        } else if right.is_empty() {
            result.append(left);
            break;
        } else if left[0] <= right[0] {
            result.push(left.remove(0));
        } else {
            result.push(right.remove(0));
        }
    }

    result
}

#[cfg(test)]
mod tests {
    use super::merge_sort;

    sorting_tests!(merge_sort);
}
