import json

def parse_obj(file_path):
    vertices = []

    with open(file_path, 'r') as file:
        for line in file:
            if line.startswith('v '):
                parts = line.split()
                vertex = [float(parts[1]), float(parts[2]), float(parts[3]), 0.0]
                vertices.extend(vertex)

    return vertices

def obj_to_json(obj_file, json_file):
    vertices = parse_obj(obj_file)
    data = {"Base_Vertex": vertices}

    with open(json_file, 'w') as file:
        json.dump(data, file, indent=4)

# File paths
obj_file_path = 'monsterfrog_5copies.obj'
json_file_path = 'base.json'

# Convert OBJ to JSON
obj_to_json(obj_file_path, json_file_path)

print(f"Converted {obj_file_path} to {json_file_path}")
