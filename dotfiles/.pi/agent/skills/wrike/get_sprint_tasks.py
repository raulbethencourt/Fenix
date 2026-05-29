import sys
import os
sys.path.insert(0, '.')

from scripts.client import WrikeClient
from scripts import epics

def main():
    client = WrikeClient()
    # Get space ID for "Développement logiciel"
    spaces = epics.get_spaces(client)
    space = None
    for s in spaces:
        if s['title'] == 'Développement logiciel':
            space = s
            break
    if not space:
        print("Space 'Développement logiciel' not found")
        return
    space_id = space['id']
    print(f"Found space: {space['title']} (ID: {space_id})", file=sys.stderr)

    # Get folders in this space
    # Using the client to get /spaces/{space_id}/folders
    resp = client.get(f"/spaces/{space_id}/folders")
    folders = resp.get('data', [])
    print(f"Found {len(folders)} folders in space", file=sys.stderr)

    # Look for folder with title containing sprint-007 (case-insensitive)
    sprint_folder = None
    for f in folders:
        title = f['title'].lower()
        if 'sprint-007' in title:
            sprint_folder = f
            break
    if not sprint_folder:
        # Try exact match
        for f in folders:
            if f['title'] == 'sprint-007':
                sprint_folder = f
                break
    if not sprint_folder:
        print("Folder for sprint-007 not found", file=sys.stderr)
        # List folder titles for debugging
        for f in folders:
            print(f"  - {f['title']}", file=sys.stderr)
        return

    print(f"Found sprint folder: {sprint_folder['title']} (ID: {sprint_folder['id']})", file=sys.stderr)
    folder_id = sprint_folder['id']

    # Get tasks in this folder
    resp = client.get(f"/folders/{folder_id}/tasks")
    tasks = resp.get('data', [])
    print(f"Found {len(tasks)} tasks in sprint folder", file=sys.stderr)

    # Build markdown summary
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
            # Assignees
            assignee_ids = task.get('assigneeIds', [])
            assignee_names = []
            if assignee_ids:
                # We could look up each assignee, but for simplicity, just show count or IDs
                assignee_names = [f"ID:{aid}" for aid in assignee_ids]
            assignee = ", ".join(assignee_names) if assignee_names else "Unassigned"
            # Due date
            due_date = task.get('dueDate', '')
            if due_date:
                # Format: YYYY-MM-DD
                due_date = due_date.split('T')[0] if 'T' in due_date else due_date
            lines.append(f"| {title} | {status} | {assignee} | {due_date} |\n")
    lines.append("\n")
    markdown = "".join(lines)
    print(markdown)

if __name__ == '__main__':
    main()
