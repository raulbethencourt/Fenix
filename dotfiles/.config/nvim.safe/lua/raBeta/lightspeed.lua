require("lightspeed").setup({
	ignore_case = true,
	exit_after_idle_msecs = { unlabeled = nil, labeled = nil },
	jump_to_unique_chars = { safety_timeout = 400 },
	match_only_the_start_of_same_char_seqs = true,
	force_beacons_into_match_width = false,
	substitute_chars = { ["\r"] = "¬" },
	special_keys = {
		next_match_group = "<space>",
		prev_match_group = "<tab>",
	},
	limit_ft_matches = 4,
	repeat_ft_with_target_char = false,
})
