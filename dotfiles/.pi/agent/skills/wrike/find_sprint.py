import sys
sys.path.insert(0, '.')

from scripts.client import WrikeClient
from scripts import epics

def find_folder_recursive(client, folder_id, target_title_lower, depth=0, max_depth=5):
    if depth > max_depth:
        return None
    indent = "  " * depth
    # Get folder details
    try:
        resp = client.get(f"/folders/{folder_id}")
        # resp could be a dict or list? According to earlier, single folder returns dict?
        # Let's check.
    except Exception as e:
        print(f"{indent}Error fetching folder {folder_id}: {e}", file=sys.stderr)
        return None
    if isinstance(resp, list):
        # If list, take first? Actually folder endpoint should return dict.
        # But just in case.
        if len(resp) == 0:
            return None
        resp = resp[0]
    title = resp.get('title', '').lower()
    if target_title_lower in title:
        print(f"{indent}Found: {resp.get('title')} (ID: {folder_id})", file=sys.stderr)
        return resp
    # Get children
    child_ids = resp.get('childIds', [])
    for cid in child_ids:
        result = find_folder_recursive(client, cid, target_title_lower, depth+1, max_depth)
        if result is not None:
            return result
    return None

def main():
    client = WrikeClient()
    spaces = epics.get_spaces(client)
    space = next((s for s in spaces if s['title'] == 'Développement logiciel'), None)
    if not space:
        print("Space not found", file=sys.stderr)
        return
    space_id = space['id']
    print(f"Searching in space: {space['title']} (ID: {space_id})", file=sys.stderr)
    target = "sprint-007"
    # Start from space root folders
    resp = client.get(f"/spaces/{space_id}/folders")
    if isinstance(resp, list):
        folders = resp
    else:
        folders = [resp] if resp else []
    for folder in folders:
        fid = folder.get('id')
        print(f"Checking folder: {folder.get('title')} (ID: {fid})", file=sys.stderr)
        result = find_folder_recursive(client, fid, target.lower())
        if result:
            sprint_folder = result
            break
    else:
        print(f"Folder with title containing '{target}' not found.", file=sys.stderr)
        return

    # Now get tasks in this sprint folder
    folder_id = sprint_folder['id']
    print(f"Fetching tasks from folder: {sprint_folder['title']} (ID: {folder_id})", file=sys.stderr)
    resp = client.get(f"/folders/{folder_id}/tasks")
    if isinstance(resp, list):
        tasks = resp
    else:
        tasks = resp.get('data', []) if isinstance(resp, dict) else []
    print(f"Found {len(tasks)} tasks.", file=sys.stderr)

    # Build markdown
    lines = []
    lines.append("### Wrike Sprint-007 Tasks\n")
    if not tasks:
        lines.append("No tasks found in sprint-007 folder.\n")
    else:
        lines.append("| Task | Status | Assignee | Due Date |\n")
        lines.append("|------|--------|----------|----------|\n")
        for task in tasks:
            title = task.get('title', 'Untitled')
            status = task.get('status', 'Unknown')
            assignee_ids = task.get('assigneeIds', [])
            assignee = ", ".join([f"ID:{aid}" for aid in assignee_ids]) if assignee_ids else "Unassigned"
            due_date = task.get('dueDate', '')
            if due_date:
                due_date = due_date.split('T')[0]
            lines.append(f"| {title} | {status} | {assignee} | {due_date} |\n")
    lines.append("\n")
    print("".join(lines))

if __name__ == '__main__':
    main()
