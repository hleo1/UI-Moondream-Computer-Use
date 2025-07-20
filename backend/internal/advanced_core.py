import moondream as md
import time
import matplotlib.pyplot as plt

from internal.core import Core

class AdvancedCore(Core):
    screen_width, screen_height = Core.get_screen_size()
    model = md.vl(endpoint="https://moondreamhosting-1011577958828.europe-west4.run.app/v1", api_key="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlfaWQiOiI1ZjBlZWRiOS02OTdmLTQyNzMtYmFkNi0xYTZhNGFmNjEwNjAiLCJvcmdfaWQiOiJub21QVmNWZ08weGE0OEhLWHR3WVh0dVZyZE9rNGhqaSIsImlhdCI6MTc1MDIxNjM4NiwidmVyIjoxfQ.Cyyyadcg86fjzZAKUsfqwOfgAjnX6zczj9zMgP0pJtE")

    @staticmethod
    def visualize(image, points, search_term) :

        plt.figure()
        plt.imshow(image)
        
        for point in points:

            # Convert normalized coordinates to actual screen coordinates using screen dimensions
            viz_x = int(point["x"] * image.width)
            viz_y = int(point["y"] * image.height)

            # Plot the clicked point
            plt.plot(viz_x, viz_y, 'ro', markersize=15, alpha=0.7)
            plt.text(
                viz_x + 10, viz_y, search_term, 
                color='white', fontsize=12,
                bbox=dict(facecolor='red', alpha=0.5)
            )
        
        plt.axis('off')
        plt.savefig("output_with_points.jpg")
        plt.show()
        return
    
    @staticmethod
    def point_image_moondream(search_term, image) -> list[dict] | None : 
        result = AdvancedCore.model.point(image, search_term)
        points = result["points"]
        if not points:
            print(f"No '{search_term}' found!")
            return None
        
        return points
        
        
    @staticmethod
    def get_all_point_with_search_term_and_crop(search_term, topleft, bottomright, visualize = False) -> list[dict] | None:
        image = Core.get_screenshot()
        #cutout image based on topleft and bottom right
        new_image = image.crop((
            int(topleft["x"] * image.width), 
            int(topleft["y"] * image.height), 
            int(bottomright["x"] * image.width), 
            int(bottomright["y"] * image.height)
        ))
        
        try:
            new_image.save("cropped_image.jpg")
        except:
            print("Failed to save cropped image")
        
        points = AdvancedCore.point_image_moondream(search_term, new_image)
        if (points == None) : 
            return None
        #convert points in the new_image to the original image
        for point in points:
            point["x"] = (point["x"] * new_image.width + topleft["x"] * image.width) / image.width
            point["y"] = (point["y"] * new_image.height + topleft["y"] * image.height) / image.height
            
        if visualize:
            AdvancedCore.visualize(image, points, search_term)
    
        return points
    
    @staticmethod
    def get_all_points_with_search_term(search_term, visualize=False) -> list[dict] | None:
        image = Core.get_screenshot()
        points = AdvancedCore.point_image_moondream(search_term, image)
        if visualize and points:
            AdvancedCore.visualize(image, points, search_term)
        return points
    
        

    @staticmethod
    def find_first_point_with_search_term(search_term) -> dict | None:
        points = AdvancedCore.get_all_points_with_search_term(search_term)
        if points is None:
            return None
        return points[0]

    @staticmethod
    def relative_to_absolute_point(point: dict) -> tuple[int, int]:
        screen_x = int(point["x"] * AdvancedCore.screen_width)
        screen_y = int(point["y"] * AdvancedCore.screen_height)
        return screen_x, screen_y
    
    # @staticmethod
    def find_closest_point_and_click(search_term, point, visualize=False) :
        points = AdvancedCore.get_all_points_with_search_term(search_term, visualize)
        if points is None:
            return None
        closest_point = min(
            points, 
            key=lambda p: (
                (p["x"] - point["x"]) * AdvancedCore.screen_width
            )**2 + (
                (p["y"] - point["y"]) * AdvancedCore.screen_height
            )**2
        )
        screen_x, screen_y = AdvancedCore.relative_to_absolute_point(closest_point)
        AdvancedCore.move_to_and_left_click(screen_x, screen_y)
        return True
        
    def find_closest_point_and_click_within_bounding_box(search_term, top_left_bounding_box, bottom_right_bounding_box, point, visualize=False) : 
        points = AdvancedCore.get_all_point_with_search_term_and_crop(search_term, top_left_bounding_box, bottom_right_bounding_box, visualize)
        if points is None:
            return None
        closest_point = min(
            points, 
            key=lambda p: (
                (p["x"] - point["x"]) * AdvancedCore.screen_width
            )**2 + (
                (p["y"] - point["y"]) * AdvancedCore.screen_height
            )**2
        )
        screen_x, screen_y = AdvancedCore.relative_to_absolute_point(closest_point)
        AdvancedCore.move_to_and_left_click(screen_x, screen_y)
        return True

    @staticmethod
    def first_point_and_click(search_term, visualize=False):
        # Add a small delay to ensure we're ready
        time.sleep(0.5)
        point = AdvancedCore.find_first_point_with_search_term(search_term)

        screen_x, screen_y = AdvancedCore.relative_to_absolute_point(point)
        
        # Move mouse to position and click
        AdvancedCore.move_to_and_left_click(screen_x, screen_y)
        
        # Wait a bit after clicking to let the UI update
        time.sleep(0.5)
        
        return True

    @staticmethod
    def left_click_middle_of_screen_and_right_click():
        Core.move_to(AdvancedCore.screen_width/2, AdvancedCore.screen_height/2)
        Core.left_click()
        Core.right_click()
    