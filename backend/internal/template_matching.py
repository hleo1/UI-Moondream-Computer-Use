import cv2
import numpy as np
import argparse
import sys
from PIL import Image


def non_max_suppression(matches, template_width, template_height, image_width, image_height, overlap_threshold=0.5):
    """
    Apply Non-Maximum Suppression to remove overlapping matches.
    
    Args:
        matches: List of (center_x, center_y, confidence) tuples with normalized coordinates
        template_width: Width of the template in pixels
        template_height: Height of the template in pixels
        image_width: Width of the main image in pixels
        image_height: Height of the main image in pixels
        overlap_threshold: IoU threshold for considering matches as overlapping
        
    Returns:
        List of filtered matches after NMS
    """
    if not matches:
        return matches
        
    # Convert normalized coordinates to pixel coordinates and create bounding boxes
    boxes = []
    scores = []
    
    for center_x, center_y, confidence in matches:
        # Convert to pixel coordinates
        pixel_x = int(center_x * image_width)
        pixel_y = int(center_y * image_height)
        
        # Create bounding box (x1, y1, x2, y2)
        x1 = pixel_x - template_width // 2
        y1 = pixel_y - template_height // 2
        x2 = pixel_x + template_width // 2
        y2 = pixel_y + template_height // 2
        
        boxes.append([x1, y1, x2, y2])
        scores.append(confidence)
    
    boxes = np.array(boxes, dtype=np.float32)
    scores = np.array(scores, dtype=np.float32)
    
    # Apply OpenCV's NMS
    indices = cv2.dnn.NMSBoxes(boxes.tolist(), scores.tolist(), 0.0, overlap_threshold)
    
    # Filter matches based on NMS results
    if len(indices) > 0:
        # Handle different OpenCV versions - indices can be different shapes
        if isinstance(indices, np.ndarray):
            if len(indices.shape) > 1:
                indices = indices.flatten()
        else:
            indices = list(indices)
        
        filtered_matches = [matches[i] for i in indices]
        return filtered_matches
    else:
        return []


def template_match_impl(template_img, image_img, only_return_max_match=False, threshold=0.0, nms_threshold=0.5):
    """
    Find the best location(s) for a template in an image using PIL Image objects.
    
    Args:
        template_img (PIL.Image): Template image object
        image_img (PIL.Image): Main image object
        only_return_max_match (bool): If True, return only the best match. If False, return all matches above threshold.
        threshold (float): Confidence threshold (0-1). Only matches above this value are returned.
        nms_threshold (float): IoU threshold for Non-Maximum Suppression to remove overlapping matches (0-1).
        
    Returns:
        If only_return_max_match=True:
            tuple: (center_x, center_y, confidence) as normalized coordinates (0-1 range) and confidence score
        If only_return_max_match=False:
            list: List of tuples [(center_x, center_y, confidence), ...] for all matches above threshold after NMS
    """
    # Convert PIL Images to OpenCV format
    template = cv2.cvtColor(np.array(template_img), cv2.COLOR_RGB2BGR)
    image = cv2.cvtColor(np.array(image_img), cv2.COLOR_RGB2BGR)
    
    # Get template dimensions
    template_height, template_width = template.shape[:2]
    image_height, image_width = image.shape[:2]
    
    # Perform template matching using normalized cross correlation
    result = cv2.matchTemplate(image, template, cv2.TM_CCOEFF_NORMED)
    
    if only_return_max_match:
        # Find the single best match
        min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(result)
        
        # Check if best match meets threshold
        if max_val < threshold:
            return None
        
        # Calculate center coordinates
        center_x = max_loc[0] + template_width // 2
        center_y = max_loc[1] + template_height // 2
        
        # Normalize coordinates
        normalized_x = center_x / image_width
        normalized_y = center_y / image_height
        
        return normalized_x, normalized_y, max_val
    else:
        # Find all matches above threshold
        matches = []
        locations = np.where(result >= threshold)
        
        # Convert to list of coordinates with confidence scores
        for pt_y, pt_x in zip(locations[0], locations[1]):
            confidence = result[pt_y, pt_x]
            
            # Calculate center coordinates
            center_x = pt_x + template_width // 2
            center_y = pt_y + template_height // 2
            
            # Normalize coordinates
            normalized_x = center_x / image_width
            normalized_y = center_y / image_height
            
            matches.append((normalized_x, normalized_y, confidence))
        
        # Sort matches by confidence (highest first)
        matches.sort(key=lambda x: x[2], reverse=True)
        
        # Apply Non-Maximum Suppression to remove overlapping matches
        if len(matches) > 1:
            matches = non_max_suppression(
                matches, template_width, template_height, 
                image_width, image_height, nms_threshold
            )
        
        return matches


def template_match(template_path, image_path, only_return_max_match=False, threshold=0.0, nms_threshold=0.5):
    """
    Find the best location(s) for a template in an image using file paths.
    
    Args:
        template_path (str): Path to the template image
        image_path (str): Path to the main image
        only_return_max_match (bool): If True, return only the best match. If False, return all matches above threshold.
        threshold (float): Confidence threshold (0-1). Only matches above this value are returned.
        nms_threshold (float): IoU threshold for Non-Maximum Suppression to remove overlapping matches (0-1).
        
    Returns:
        If only_return_max_match=True:
            tuple: (center_x, center_y, confidence) as normalized coordinates (0-1 range) and confidence score
        If only_return_max_match=False:
            list: List of tuples [(center_x, center_y, confidence), ...] for all matches above threshold after NMS
    """
    # Load images using PIL
    try:
        template_img = Image.open(template_path).convert('RGB')
        image_img = Image.open(image_path).convert('RGB')
    except Exception as e:
        raise ValueError(f"Could not load images: {e}")
    
    # Call the implementation function
    return template_match_impl(
        template_img, image_img, 
        only_return_max_match, threshold, nms_threshold
    )


def visualize_match(template_path, image_path, matches, threshold=0, save=False):
    """
    Draw red circles at the matched locations and display the image.
    
    Args:
        template_path (str): Path to the template image
        image_path (str): Path to the main image
        matches: Either a single tuple (center_x, center_y, confidence) or a list of such tuples
    """
    # Load the main image
    image = cv2.imread(image_path, cv2.IMREAD_COLOR)
    template = cv2.imread(template_path, cv2.IMREAD_COLOR)
    
    if image is None or template is None:
        print("Error: Could not load images for visualization")
        return
    
    # Get image dimensions
    image_height, image_width = image.shape[:2]
    
    # Handle both single match and multiple matches
    if matches is None:
        print("No matches found above threshold")
        return
        
    # Convert single match to list format for uniform processing
    if not isinstance(matches, list):
        matches = [matches]
    
    print(f"Found {len(matches)} match(es):")
    
    # Draw circles for all matches
    for i, (center_x, center_y, confidence) in enumerate(matches):
        # Convert normalized coordinates back to pixel coordinates
        pixel_x = int(center_x * image_width)
        pixel_y = int(center_y * image_height)
        
        # Draw red circle around the match
        radius = 20
        cv2.circle(image, (pixel_x, pixel_y), radius, (0, 0, 255), 3)
        
        # Add match number for multiple matches
        if len(matches) > 1:
            cv2.putText(image, f"{i+1}", (pixel_x-10, pixel_y-25), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
        
        print(f"  Match {i+1}: normalized ({center_x:.3f}, {center_y:.3f}), "
              f"pixel ({pixel_x}, {pixel_y}), confidence: {confidence:.3f}")
    
    # Display the image
    if not save:
        cv2.imshow('Template Match Result', image)
        print("Press any key to close the window...")
        cv2.waitKey(0)
        cv2.destroyAllWindows()
    if save:
        cv2.imwrite(f"template_matching_images/matches/matches_{template_path.split('/')[-1].split('.')[0]}_{image_path.split('/')[-1].split('.')[0]}_{threshold}.png", image)


def main():
    """
    Main function to handle command line arguments and execute template matching.
    """
    parser = argparse.ArgumentParser(description='Template matching with visualization')
    parser.add_argument('template', help='Path to the template image')
    parser.add_argument('image', help='Path to the main image')
    parser.add_argument('--threshold', type=float, default=0.0, 
                       help='Confidence threshold (0-1, default: 0.0)')
    parser.add_argument('--all-matches', action='store_true',
                       help='Show all matches above threshold (default: only best match)')
    parser.add_argument('--nms-threshold', type=float, default=0.5,
                       help='IoU threshold for Non-Maximum Suppression (0-1, default: 0.5)')
    parser.add_argument('--save', action='store_true',
                       help='Save the result image to a file')
    
    args = parser.parse_args()
    
    try:
        # Perform template matching with user parameters
        matches = template_match(
            args.template, 
            args.image, 
            only_return_max_match=not args.all_matches,
            threshold=args.threshold,
            nms_threshold=args.nms_threshold
        )
        
        # Visualize the result
        visualize_match(args.template, args.image, matches, args.threshold, args.save)
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
